Golarion Map
============

Simple server to show a map of golarion, whilst allowing the GM to drive and players to be carried along.

Build the image
---------------
```bash
docker build . -t golarion-map
```

Run the image
-------------
Save the map images in a folder, then mount it into the docker.
The command below will expose the server on `htpp://localhost:8080/`

```bash
docker run --rm -p 8080:8080 -v /path/to/maps:/app/static/map golarion-map:latest
```

Use the map
-----------
- The GM logs into the map as `http://localhost:8080/static/map.html?gm`
- The players log into the map as `http://localhost:8080/static/map.html?pc`
- The GM may add markers to the map by clicking the "M" button, then typing a name
- The GM may share their "Live" view (including all markers, but not the crosshair)
with the "L" button.
- While "Live", the current state is preserved in the URL, so you can save a link for later.
  - You might want to remove the `&gm` if you share it with players
- There is a searchbar in the top right to find PoI in Avistan and Garund
