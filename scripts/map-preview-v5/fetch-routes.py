exec(open('work/fetch-v5.py').read().split('\nget(base,')[0])
where="((RTE_PRFX = 'SL' AND RTE_NBR = '1604') OR (RTE_PRFX = 'US' AND RTE_NBR IN ('90','281')) OR (RTE_PRFX = 'SH' AND RTE_NBR IN ('46','211')) OR (RTE_PRFX = 'IH' AND RTE_NBR IN ('10','35','37','410'))) AND RDBD_TYPE IN ('Single Roadbed','Right Roadbed','Left Roadbed')"
ids=get(base,dict(common,where=where,returnIdsOnly='true',f='json'),'route-ids.json').get('objectIds',[])
print('IDs',len(ids))
features=[]
for start in range(0,len(ids),100):
 d=get(base,dict(outFields='RTE_NM,RTE_PRFX,RTE_NBR,RDBD_TYPE,MAP_LBL,EXT_DATE',objectIds=','.join(map(str,ids[start:start+100])),outSR=4326,f='geojson',maxAllowableOffset=.00015),f'route-part-{start}.json')
 features+=d['features']
(p/'verified-roads.json').write_text(json.dumps(dict(type='FeatureCollection',features=features)))
get('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4',dict(where="PLACE = '65000' AND STATE = '48'",outFields='NAME,STATE,PLACE',outSR=4326,f='geojson',maxAllowableOffset=.00015),'san-antonio.json')


