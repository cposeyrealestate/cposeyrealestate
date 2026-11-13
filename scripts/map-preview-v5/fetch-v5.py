import json,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
p=Path(__file__).parent
def get(base,params,out):
 u=base+'/query?'+urllib.parse.urlencode(params)
 d=json.load(urllib.request.urlopen(u,timeout=90))
 if 'error' in d: raise RuntimeError(d['error'])
 (p/out).write_text(json.dumps(d))
 print(out,len(d.get('features',[])),d.get('exceededTransferLimit'))
 return d
common=dict(geometry='-99.25,28.80,-97.50,30.25',geometryType='esriGeometryEnvelope',inSR=4326,outSR=4326,spatialRel='esriSpatialRelIntersects',f='geojson',returnGeometry='true',maxAllowableOffset=.00015)
base='https://services.arcgis.com/KTcxiTD9dsQw4r7Z/ArcGIS/rest/services/TxDOT_Roadways/FeatureServer/0'
get(base,dict(common,where="RTE_PRFX IN ('IH','US','SH','SL')",outFields='RTE_NM,RTE_PRFX,RTE_NBR,RDBD_TYPE,MAP_LBL,EXT_DATE',resultRecordCount=2000),'txdot-roads.json')
get('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1',dict(where="ZCTA5 IN ('78258','78259','78260')",outFields='ZCTA5',outSR=4326,f='geojson',maxAllowableOffset=.00015),'north-zips.json')
