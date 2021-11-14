FROM python:3.7-slim-bullseye
WORKDIR /app
EXPOSE 8080

COPY requirements.txt ./
RUN pip install --upgrade --no-cache-dir pip & \
    pip install --no-cache-dir -r requirements.txt

COPY . ./

VOLUME ["/app/static/map"]

ENTRYPOINT ["./server.py"] 
