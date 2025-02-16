import logging
import os 
import sys
from datetime import datetime

## Define the folder/directory where we want to store our log file 
log_dir= "logs"

# Defining the Logging file format
log_file_string_format = "%(asctime)s - %(levelname)s - %(module)s - %(message)s"

## create the logs folder

os.makedirs(log_dir, exist_ok=True)

## Get the current log file number using last available log file 

existing_logs=[f for f in os.listdir(log_dir) if f.startswith("logfile_") and f.endswith(".log")]
log_number=len(existing_logs)+1

## let's create a log file name with a number and time stamp 

timestamp=datetime.now().strftime("%m_%d_%Y-%H'h'_%M'm'_%S's'")
log_file_name=f"logfile_{log_number}_{timestamp}.log"

## Full path for the log file 

log_file_path=os.path.join(log_dir, log_file_name)

## configure logging using basicconfig

logging.basicConfig(level=logging.WARNING,
                    format=log_file_string_format,
                    handlers=[
                        logging.FileHandler(log_file_path, encoding="utf-8"),
                              logging.StreamHandler()])

logger = logging.getLogger(__name__)

if __name__=="__main__":
    logger.info("This is a test log message")
    logger.warning("This is a test warning message")
    logger.error("This is a test error message")
    logger.critical("This is a test critical message")
    logger.debug("This is a test debug message")