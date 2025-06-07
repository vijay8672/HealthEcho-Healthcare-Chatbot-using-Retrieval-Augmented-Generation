import sys
from src.chain.chain_builder import ChainBuilder
from bs4 import BeautifulSoup

# Instantiate ChainBuilder once
global_chain_builder = ChainBuilder()

def main():
    if len(sys.argv) >= 2:
        query = sys.argv[1]
    else:
        query = input("Enter your query: ")

    # Use a fixed device_id for testing
    device_id = "test"
    response = global_chain_builder.run_chain(query, device_id)
    response_content = BeautifulSoup(response["content"], "html.parser").get_text() if "content" in response else str(response)
    print("\nModel Response:\n" + response_content)

if __name__ == "__main__":
    main()