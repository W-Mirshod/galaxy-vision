import os
import httpx
from typing import Optional


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


async def send_telegram_message(message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"Telegram not configured. Would send: {message}")
        return False
    
    telegram_api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                telegram_api_url,
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "HTML"
                },
                timeout=10.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")
        return False


async def send_victory_message(promo_code: str) -> bool:
    message = f"Victory! Promo code issued: {promo_code}"
    return await send_telegram_message(message)


async def send_loss_message() -> bool:
    message = "Loss"
    return await send_telegram_message(message)

