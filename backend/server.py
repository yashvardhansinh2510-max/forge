import urllib.request
import urllib.error
from fastapi import FastAPI, Request
from fastapi.responses import Response

app = FastAPI()

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(request: Request, path: str):
    # Ingress keeps /api prefix — forward as-is to Next.js on port 3000
    target = f"http://localhost:3000/{path}"
    if request.url.query:
        target += f"?{request.url.query}"
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ('host', 'transfer-encoding')}
    body = await request.body()
    
    req = urllib.request.Request(
        target,
        data=body if body else None,
        headers=headers,
        method=request.method
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read()
            resp_headers = {k: v for k, v in resp.headers.items() 
                         if k.lower() not in ('transfer-encoding', 'connection', 'content-encoding')}
            return Response(content=content, status_code=resp.status, headers=resp_headers)
    except urllib.error.HTTPError as e:
        content = e.read()
        return Response(content=content, status_code=e.code)
    except Exception as e:
        return Response(content=str(e).encode(), status_code=502)
