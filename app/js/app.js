"use strict";

let map;

const OlGeoJSON = ol.format.GeoJSON;
const OlVectorSource = ol.source.Vector;
const OlVectorLayer = ol.layer.Vector;
const OlTile = ol.layer.Tile;
const OlView = ol.View;
const olTransform = ol.proj.transform;
const OlMap = ol.Map;
const OlOSMSource = ol.source.OSM;

if (!WebAssembly.instantiateStreaming) {
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
    };
}
const go = new Go();
WebAssembly.instantiateStreaming(fetch("wasm/gpkg.wasm"), go.importObject).then(async (result) => {
    const mod = result.module;
    const inst = result.instance;
    await run(mod, inst);
}).catch((err) => {
    console.error(err);
});

async function run(mod, inst) {

    go.run(inst);
    await WebAssembly.instantiate(mod, go.importObject);
    endLoader();
    initMap();
    addEventsListeners();
}

async function addEventsListeners(){
    const dialog = document.getElementById("clear-log-dialog");
    dialog.addEventListener('keydown', (event) => {
        event.preventDefault();
    });
    dialog.addEventListener('close', (event) => {
        // const close  = (event.target.getAttribute("close-dialog") === 'true');
        // if (!close){
        //     dialog.showModal();
        // }
    });
    document.getElementById("list-features").addEventListener("click", async ()=>{
        await startLoader("Loading tables..");
        const res = listFeatures();
        endLoader();
    });
    document.getElementById("list-records").addEventListener("click", async ()=>{
        await startLoader("Loading records...");
        listRecords();
        endLoader();
        
    });
    document.getElementById("file-input").oninput = async () => {
        document.getElementById("log").innerHTML = "";
        await startLoader("Loading database...");
        const input = document.getElementById("file-input");
        const buffer = await input.files[0].arrayBuffer();
        copyBytesToDb(buffer);
        endLoader();
    };
    document.getElementById("clear-log").addEventListener("click", ()=>{
        dialog.showModal(); 
    });
    document.getElementById("clear-log-btn").addEventListener("click", ()=>{
        document.getElementById("clear-log-dialog").setAttribute("close-dialog", false);
        document.getElementById("log").innerHTML = "";
    });
    document.getElementById("close-dialog-btn").addEventListener("click", ()=>{
        document.getElementById("clear-log-dialog").setAttribute("close-dialog", true);
    });
    document.getElementById("display-table").addEventListener("click", async()=>{
        await startLoader("Loading layers...");
        const tables = listFeatures();
        tables.forEach((table, i) => {
            const res = getGeoJson(table);
            if (res.error){
                alert(res.error)
                return
            }
            const geojsonObject = JSON.parse(res.data);
            
            const features = new OlGeoJSON().readFeatures(geojsonObject);
            const transformFeaturs = features.map((feature)=>{
                feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
                return feature;
            })
            const vectorSource = new OlVectorSource({
                features: transformFeaturs
            });
            const vectorLayer = new OlVectorLayer({
                source: vectorSource
            })
            map.addLayer(vectorLayer);
            map.getView().fit(vectorSource.getExtent());
        })
        endLoader();
    });
}

document.addEventListener("DOMContentLoaded", ()=>{
    startLoader("Loading WebAssembly module...");
});

async function startLoader(text){
    const loader = document.getElementById("loader");
    const loaderMsg = document.getElementById("loader-msg");
    loader.classList.add("loader");
    loaderMsg.innerText = text;
    await sleep(1)
}

function endLoader(){
    const loader = document.getElementById("loader");
    const loaderMsg = document.getElementById("loader-msg");
    loader.classList.remove("loader");
    loaderMsg.innerText = "";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function initMap(){
    const layers = [
        new OlTile({source: new OlOSMSource()}),
      ];
    map = new OlMap({
        
        target: 'map', 
        layers: layers
    });
    const view = new OlView({
        zoom: 10,
    })
    map.setView(view);
    map.getView().setCenter(olTransform([15.62415, 52.08588], 'EPSG:4326', 'EPSG:3857'))
}