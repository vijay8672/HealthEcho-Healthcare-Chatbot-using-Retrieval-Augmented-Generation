"""
Email service for sending emails.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional

from ..utils.logger import get_logger

logger = get_logger(__name__)

class EmailService:
    """Email service for sending emails."""
    
    def __init__(self, 
                 smtp_server: str = None, 
                 smtp_port: int = None,
                 smtp_username: str = None,
                 smtp_password: str = None,
                 sender_email: str = None):
        """
        Initialize the email service.
        
        Args:
            smtp_server: SMTP server address
            smtp_port: SMTP server port
            smtp_username: SMTP username
            smtp_password: SMTP password
            sender_email: Sender email address
        """
        # Load from environment variables if not provided
        self.smtp_server = smtp_server or os.environ.get('SMTP_SERVER')
        self.smtp_port = smtp_port or int(os.environ.get('SMTP_PORT', 587))
        self.smtp_username = smtp_username or os.environ.get('SMTP_USERNAME')
        self.smtp_password = smtp_password or os.environ.get('SMTP_PASSWORD')
        self.sender_email = sender_email or os.environ.get('SENDER_EMAIL')
        
        # Validate required settings
        if not all([self.smtp_server, self.smtp_port, self.smtp_username, 
                   self.smtp_password, self.sender_email]):
            logger.warning("Email service not fully configured. Some settings are missing.")
    
    def send_email(self, 
                  to_emails: List[str], 
                  subject: str, 
                  body: str,
                  cc_emails: List[str] = None,
                  bcc_emails: List[str] = None,
                  html_body: str = None) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            body: Email body (plain text)
            cc_emails: List of CC email addresses
            bcc_emails: List of BCC email addresses
            html_body: Email body (HTML)
            
        Returns:
            Dictionary with the result of the operation
        """
        if not all([self.smtp_server, self.smtp_port, self.smtp_username, 
                   self.smtp_password, self.sender_email]):
            return {
                "success": False,
                "message": "Email service not fully configured"
            }
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = ', '.join(to_emails)
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            if bcc_emails:
                msg['Bcc'] = ', '.join(bcc_emails)
            
            # Attach plain text body
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach HTML body if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            # Connect to SMTP server
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Secure the connection
                server.login(self.smtp_username, self.smtp_password)
                
                # Get all recipients
                all_recipients = to_emails.copy()
                if cc_emails:
                    all_recipients.extend(cc_emails)
                if bcc_emails:
                    all_recipients.extend(bcc_emails)
                
                # Send email
                server.sendmail(self.sender_email, all_recipients, msg.as_string())
            
            logger.info(f"Email sent to {', '.join(to_emails)}")
            return {
                "success": True,
                "message": "Email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {
                "success": False,
                "message": f"Error sending email: {str(e)}"
            }
    
    def send_escalation_email(self, 
                             hr_emails: List[str], 
                             user_query: str,
                             conversation_history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send an escalation email to HR.
        
        Args:
            hr_emails: List of HR email addresses
            user_query: User's query that needs escalation
            conversation_history: Conversation history for context
            
        Returns:
            Dictionary with the result of the operation
        """
        subject = "HR Query Escalation: Employee Question Requires Attention"
        
        # Build email body
        body = f"""
Hello HR Team,

An employee has asked a question that our HR Assistant couldn't answer with the available information:

EMPLOYEE QUESTION:
{user_query}

This question requires human attention as it may involve:
- Organization-specific information not in our knowledge base
- A policy that needs clarification or interpretation
- A complex HR situation requiring human judgment

"""
        
        # Add conversation history if available
        if conversation_history and len(conversation_history) > 0:
            body += "\nRECENT CONVERSATION CONTEXT:\n"
            for i, msg in enumerate(conversation_history[-3:]):  # Include last 3 exchanges
                body += f"User: {msg.get('user_query', '')}\n"
                body += f"Assistant: {msg.get('assistant_response', '')}\n\n"
        
        body += """
Please review this question and provide a response to the employee.

Thank you,
HR Assistant Bot
"""
        
        # Send email
        return self.send_email(
            to_emails=hr_emails,
            subject=subject,
            body=body
        )
