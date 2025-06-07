"""
Chain package initialization.
"""

from .prompt_templates import create_hr_assistant_prompt
from .chain_builder import ChainBuilder

__all__ = [
    'create_hr_assistant_prompt',
    'ChainBuilder'
]
