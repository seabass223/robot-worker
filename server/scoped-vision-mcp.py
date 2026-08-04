import asyncio
import re
from pathlib import Path

from mcp.server.fastmcp import FastMCP
from tools.vision_tools import vision_analyze_tool

ROOT = Path.home() / "AppData" / "Local" / "Temp" / "room-editor-reference-images"
ATTACHMENT_ID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg)$", re.IGNORECASE)
mcp = FastMCP("room-editor-reference-vision")


@mcp.tool()
async def analyze_reference_attachment(attachment_id: str, question: str = "Describe the object's geometry, proportions, materials, and construction details for faithful 3D reconstruction.") -> str:
    """Analyze one server-validated room-editor reference image by opaque attachment ID."""
    if not ATTACHMENT_ID.fullmatch(str(attachment_id or "")):
        raise ValueError("Invalid room-editor attachment ID")
    path = (ROOT / attachment_id).resolve(strict=True)
    if path.parent != ROOT.resolve() or not path.is_file() or path.is_symlink():
        raise ValueError("Room-editor attachment is unavailable")
    safe_question = str(question or "")[:1000]
    return await vision_analyze_tool(str(path), safe_question)


if __name__ == "__main__":
    mcp.run(transport="stdio")
