from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

def create_advanced_prompt_template() -> ChatPromptTemplate:
    """
    Creates an advanced prompt template that includes:
      - A system message setting behavior and language (using {Language}).
      - A human message that expects a context and a question.
      - A placeholder for any additional messages (e.g. previous history).
    """
    messages = [
        ("system", "You are a helpful assistant. Answer all questions clearly and respectfully in {Language}."),
        ("human", "Use the following context to answer the question, Context: {context}, Question: {question}")
    ]
    # Append a placeholder for any additional conversation history if needed.
    prompt = ChatPromptTemplate.from_messages(messages + [MessagesPlaceholder(variable_name="messages")])
    return prompt