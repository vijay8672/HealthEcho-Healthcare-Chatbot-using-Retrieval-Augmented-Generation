import requests
from bs4 import BeautifulSoup
import numpy as np
import json
from langchain_huggingface import HuggingFaceEmbeddings
from google.cloud import storage
from io import BytesIO
from logging_module.logger import logger
from sklearn.preprocessing import normalize
from concurrent.futures import ThreadPoolExecutor

# Configurations
WHO_FACTSHEET_URL = "https://www.who.int/news-room/fact-sheets"
EMBEDDING_MODEL = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
BUCKET_NAME = "healthecho-bucket"
EMBEDDINGS_PATH = "embeddings/disease_embeddings.npy"
METADATA_PATH = "embeddings/disease_metadata.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def get_all_fact_sheet_links():
    """Fetches all disease fact sheet links from WHO."""
    try:
        for _ in range(3):  # Retry mechanism
            try:
                response = requests.get(WHO_FACTSHEET_URL, headers=HEADERS, timeout=10)
                response.raise_for_status()
                break
            except requests.RequestException as e:
                logger.warning(f"Retrying due to: {e}")
        else:
            logger.error("Failed to fetch WHO fact sheet page after retries.")
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        links = [
            "https://www.who.int" + a["href"]
            for a in soup.select("a[href^='/news-room/fact-sheets/detail/']")
            if "/news-room/fact-sheets/detail/" in a["href"]
        ]

        if not links:
            logger.warning("No fact sheet links found. WHO page structure may have changed.")
        logger.info(f"Found {len(links)} fact sheet links.")
        return links
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return []

def scrape_disease_data(url):
    """Scrapes disease data from a WHO fact sheet URL."""
    try:
        for _ in range(3):  # Retry mechanism
            try:
                response = requests.get(url, headers=HEADERS, timeout=10)
                response.raise_for_status()
                break
            except requests.RequestException as e:
                logger.warning(f"Retrying {url} due to: {e}")
        else:
            logger.error(f"Failed to fetch {url} after retries.")
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.find("h1").text.strip() if soup.find("h1") else "Unknown"
        
        # More flexible selector for content extraction
        content_sections = soup.select("article p, article li")
        content = "\n".join([p.text.strip() for p in content_sections if p.text.strip()])

        if not content:
            logger.warning(f"No content extracted from {url}")
            return None

        return {"title": title, "content": content, "url": url}
    except Exception as e:
        logger.error(f"Unexpected error while scraping {url}: {e}")
        return None

def generate_and_upload_embeddings():
    """Scrapes WHO disease data, generates embeddings, and uploads to GCP."""
    links = get_all_fact_sheet_links()
    if not links:
        logger.error("No disease data found. Exiting process.")
        return

    # Parallelize scraping for faster execution
    with ThreadPoolExecutor(max_workers=5) as executor:
        disease_data = list(executor.map(scrape_disease_data, links))
    disease_data = [d for d in disease_data if d]

    if not disease_data:
        logger.error("No disease details extracted. Exiting process.")
        return

    # Generate embeddings
    embeddings_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    texts = [d["content"] for d in disease_data]
    embeddings = embeddings_model.embed_documents(texts)

    # Convert to numpy array and normalize
    embeddings_array = np.array(embeddings).astype('float32')
    embeddings_array = normalize(embeddings_array)
    logger.info(f"Generated embeddings shape: {embeddings_array.shape}")

    metadata = [{"title": d["title"], "url": d["url"]} for d in disease_data]

    # Upload to GCS
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    
    # Upload .npy embeddings (using np.save for compatibility)
    embeddings_io = BytesIO()
    np.save(embeddings_io, embeddings_array)
    embeddings_io.seek(0)
    blob = bucket.blob(EMBEDDINGS_PATH)
    blob.upload_from_file(embeddings_io, content_type="application/octet-stream")
    logger.info(f"Uploaded embeddings to gs://{BUCKET_NAME}/{EMBEDDINGS_PATH}")
    
    # Upload metadata as JSON
    blob_metadata = bucket.blob(METADATA_PATH)
    blob_metadata.upload_from_string(json.dumps(metadata, indent=2), content_type="application/json")
    logger.info(f"Uploaded metadata to gs://{BUCKET_NAME}/{METADATA_PATH}")

if __name__ == "__main__":
    generate_and_upload_embeddings()