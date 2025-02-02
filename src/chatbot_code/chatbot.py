# chatbot.py
from src.chain.chain_builder import create_chatbot_chain


def answer_question(query: str, session_id: str = "default") -> str:
    """
    Answers the given query using the full chatbot chain, which includes:
      - Advanced prompt formatting
      - (Optional) Document retrieval context
      - Conversation history management

    Args:
        query (str): The user's question.
        session_id (str): Identifier for conversation history.

    Returns:
        str: The chatbot's answer.
    """
    # Create the chain (with history) using the given session_id.
    chain = create_chatbot_chain(session_id)
    
    # Configuration: pass the session_id under "configurable".
    config = {"configurable": {"session_id": session_id}}
    
    # Invoke the chain with a complete input dict.
    input_data = {
        "context": "",
        "Language": "English",
        "question": query,
        "messages": []
    }
    response = chain.invoke(input_data, config)
    
    return response.content

def main():
    """
    Runs the chatbot in interactive mode. Type 'exit' to quit.
    """
    print("Welcome to the ChatBot! (Type 'exit' to quit)")
    session_id = "default"
    while True:
        user_input = input("Enter your question: ")
        if user_input.strip().lower() in {"exit", "quit"}:
            print("Goodbye!")
            break
        try:
            answer = answer_question(user_input, session_id)
            print("ChatBot:", answer)
        except Exception as e:
            print("An error occurred:", e)

if __name__ == "__main__":
    main()