# prompts.py

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, HumanMessagePromptTemplate

def create_advanced_prompt_template(language: str, role: str) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        # Defining the system behavior and tone
        SystemMessagePromptTemplate.from_template(f"You are a knowledgeable {role}. Provide clear, respectful, and medically accurate answers in {language}."),
        SystemMessagePromptTemplate.from_template("If the question is unclear, ask for clarification. Always maintain a compassionate tone."),
        SystemMessagePromptTemplate.from_template("Use reliable medical data and ensure explanations are easy to understand."),
        SystemMessagePromptTemplate.from_template("After providing the answer, ask the user for feedback on the clarity and helpfulness of the response."),
        SystemMessagePromptTemplate.from_template("If you are unsure about an answer, say 'I am not qualified to give medical advice. Please consult a healthcare professional.'"),
        
        # Placeholder for conversation history
        MessagesPlaceholder(variable_name='history'),
        
        # User's input to respond to
        HumanMessagePromptTemplate.from_template("{input}"),
        HumanMessagePromptTemplate.from_template("Based on our conversation, please answer the following: {input}")
    ])
