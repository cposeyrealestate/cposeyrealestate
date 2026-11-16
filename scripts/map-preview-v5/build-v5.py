import sys,json,re,math,html
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'pydeps'))
from shapely.geometry import shape,Polygon,Point,box,mapping
from shapely.ops import unary_union,transform,polylabel,nearest_points
from shapely import make_valid
p=Path(__file__).parent
source=(p/'map-v4.html').read_text(encoding='utf-8')
svg=re.search(r'<svg id="region".*?</svg>',source,re.S).group()
areas=json.loads(re.search(r'const areas=(.*?);let selected',source,re.S).group(1))
def project(x,y,z=None):return 440+(x+98.4936)*615,700-(y-29.4241)*707
def readpath(d):
 g=Polygon()
 for r in re.findall(r'M([^Z]+)Z',d):
  vals=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',r)))
  ring=Polygon(list(zip(vals[::2],vals[1::2])))
  g=g.symmetric_difference(make_valid(ring))
 return g
def coords(c):return 'M'+'L'.join(f'{x:.2f},{y:.2f}'for x,y,*_ in c)
def path(g):
 if g.is_empty:return ''
 if g.geom_type=='Polygon':return coords(g.exterior.coords)+'Z'+''.join(coords(r.coords)+'Z'for r in g.interiors)
 if g.geom_type in ('LineString','LinearRing'):return coords(g.coords)
 return ''.join(path(x)for x in g.geoms)
geoms={}
for tag in re.findall(r'<path class="area"[^>]+/>',svg):
 key=re.search(r'data-id="([^"]+)"',tag).group(1);d=re.search(r' d="([^"]+)"',tag).group(1);geoms[key]=readpath(d)
north=json.loads((p/'north-zips.json').read_text())
geoms['stone-oak']=transform(project,unary_union([shape(f['geometry']) for f in north['features']])).simplify(.35,preserve_topology=True)
sa=json.loads((p/'san-antonio.json').read_text())
assert len(sa['features'])==1,'Expected one San Antonio boundary'
sa_raw=transform(project,shape(sa['features'][0]['geometry'])).simplify(.4,preserve_topology=True)
geoms['san-antonio']=make_valid(sa_raw.difference(unary_union(list(geoms.values()))))
for a in areas:
 if a['id']=='stone-oak':a.update(name='Stone Oak / Encino Park',short='Stone Oak / Encino Park',zips=['78258','78259','78260'],description='Explore Stone Oak, Encino Park, and the surrounding north San Antonio area. The grouped ZIP footprint also includes Timberwood Park and other neighborhoods; it is broader than either named neighborhood.')
areas.append(dict(id='san-antonio',name='San Antonio',short='San Antonio',zips=[],url='/san-antonio/',description='Explore San Antonio. This background area follows the Census municipal footprint, with the separately featured living areas cut out for clarity. It does not fill every unincorporated gap.'))
def replace_group(cls,body):
 global svg
 # Find matching closing g, including nested groups.
 start=svg.index(f'<g class="{cls}"');openend=svg.index('>',start)+1;depth=1
 for m in re.finditer(r'<g\b[^>]*>|</g>',svg[openend:]):
  depth+= -1 if m.group()=='</g>' else 1
  if depth==0:
   end=openend+m.end();svg=svg[:start]+f'<g class="{cls}">'+body+'</g>'+svg[end:];return
 raise ValueError(cls)
areahtml=''
for i,key in enumerate(['san-antonio']+[a['id']for a in areas if a['id']!='san-antonio']):
 col='#244450' if key=='san-antonio' else ['#2b4c58','#304f5a','#294753','#31515e'][i%4]
 areahtml+=f'<path class="area" data-id="{key}" d="{path(geoms[key])}" fill="{col}"/>'
replace_group('areas',areahtml)
roads=json.loads((p/'verified-roads.json').read_text());rgeom={}
clip=box(-99.25,28.80,-97.50,30.25)
for f in roads['features']:
 prop=f['properties'];key=prop['RTE_PRFX']+prop['RTE_NBR']
 rgeom.setdefault(key,[]).append(transform(project,shape(f['geometry']).intersection(clip)))
required=['SL1604','US90','US281','SH46','SH211','IH37']
assert all(k in rgeom for k in required),str(rgeom.keys())
rgeom={k:unary_union(v).simplify(.12,preserve_topology=True)for k,v in rgeom.items()}
replace_group('roads',''.join(f'<path data-route="{key}" d="{path(g)}"><title>{key} — TxDOT route geometry</title></path>'for key,g in rgeom.items()))
names={'boerne':['BOERNE /','FAIR OAKS'],'bulverde':['BULVERDE /','SPRING BRANCH'],'canyon-lake':['CANYON','LAKE'],'new-braunfels':['NEW','BRAUNFELS'],'garden-ridge':['GARDEN','RIDGE'],'stone-oak':['STONE OAK /','ENCINO PARK'],'schertz':['SCHERTZ /','SELMA'],'cibolo':['CIBOLO'],'seguin':['SEGUIN'],'universal-city':['UNIVERSAL','CITY'],'northeast':['LIVE OAK /','CONVERSE'],'san-antonio':['SAN ANTONIO']}
names['northeast']=['LIVE OAK /','CONVERSE']
labelboxes=[box(400,685,480,730)];labels=[];report={}
for radius in [80,180,380]:
 x=440+radius*math.cos(math.radians(155));y=700-radius*math.sin(math.radians(155))
 labelboxes.append(box(x-40,y-14,x+40,y+14))
for key in ['universal-city','northeast','cibolo','schertz','garden-ridge','stone-oak','san-antonio','boerne','bulverde','canyon-lake','new-braunfels','seguin']:
 g=geoms[key];polys=[g] if g.geom_type=='Polygon' else [s for s in g.geoms if s.geom_type=='Polygon'];main=max(polys,key=lambda x:x.area);center=polylabel(main,tolerance=.5);lines=names[key]
 if key=='san-antonio':center=Point(*project(-98.51,29.34))
 minx,miny,maxx,maxy=main.bounds
 candidates=[center,main.representative_point()]+[Point(minx+(maxx-minx)*i/25,miny+(maxy-miny)*j/25)for i in range(1,25)for j in range(1,25)]
 found=None
 for size in range(22,3,-1):
  w=max(map(len,lines))*size*.62;h=len(lines)*size*1.15
  good=[]
  for pt in candidates:
   rect=box(pt.x-w/2,pt.y-h/2,pt.x+w/2,pt.y+h/2)
   if main.covers(rect) and all(not rect.buffer(3).intersects(b)for b in labelboxes):good.append((pt.distance(center),pt,rect))
  if good:
   _,pt,rect=min(good,key=lambda v:v[0]);found=(size,pt,rect);break
 if found is None or found[0]<10:
  size=10;w=max(map(len,lines))*size*.55;h=len(lines)*size*1.1
  good=[]
  for pt in candidates:
   rect=box(pt.x-w/2,pt.y-h/2,pt.x+w/2,pt.y+h/2)
   if main.contains(pt) and all(not rect.buffer(2).intersects(b)for b in labelboxes):good.append((pt.distance(center),pt,rect))
  assert good,key
  _,pt,rect=min(good,key=lambda v:v[0]);found=(size,pt,rect)
 size,pt,rect=found;labelboxes.append(rect);report[key]={'font':size,'x':pt.x,'y':pt.y,'anchor_inside_area':bool(g.contains(pt)),'bounds_inside_area':bool(g.covers(rect))}
 ts=''.join(f'<tspan x="{pt.x:.2f}" dy="{0 if i==0 else size*1.15}">{line}</tspan>'for i,line in enumerate(lines))
 y=pt.y-(len(lines)-1)*size*1.15/2+size*.33
 labels.append(f'<g class="place" role="button" tabindex="0" aria-label="Explore {html.escape(" ".join(lines))}" data-id="{key}"><text x="{pt.x:.2f}" y="{y:.2f}" text-anchor="middle" style="font-size:{size}px">{ts}</text></g>')
replace_group('places',''.join(labels))
# Snap each shield to its actual route. Try nearby positions to avoid place labels.
targets=[('SL1604',-98.66,29.59),('SL1604',-98.28,29.28),('US90',-98.82,29.35),('US281',-98.45,29.83),('US281',-98.49,29.20),('SH46',-98.58,29.79),('SH46',-98.03,29.64),('SH211',-98.80,29.47),('IH37',-98.37,29.20),('IH10',-98.72,29.71),('IH10',-98.10,29.50),('IH35',-98.20,29.64),('IH410',-98.62,29.43)]
shields=[]
for key,lon,lat in targets:
 pt=nearest_points(rgeom[key],Point(*project(lon,lat)))[0];txt={'SL':'LOOP ','SH':'SH ','US':'US ','IH':'I-'}[key[:2]]+key[2:];w=len(txt)*5.6+10
 rect=box(pt.x-w/2,pt.y-9,pt.x+w/2,pt.y+9)
 if any(rect.intersects(b)for b in labelboxes):
  for dx,dy in [(0,-25),(0,25),(-30,0),(30,0)]:
   alt=nearest_points(rgeom[key],Point(pt.x+dx,pt.y+dy))[0];r=box(alt.x-w/2,alt.y-9,alt.x+w/2,alt.y+9)
   if not any(r.intersects(b)for b in labelboxes):pt=alt;break
 shields.append(f'<g class="shield" transform="translate({pt.x:.2f} {pt.y:.2f})"><rect x="{-w/2}" y="-9" width="{w}" height="18" rx="4"/><text text-anchor="middle" y="3">{txt}</text></g>')
replace_group('shields',''.join(shields))
replace_group('downtown','<circle cx="440" cy="700" r="5"/><text class="downtown-sub" x="440" y="717" text-anchor="middle">DOWNTOWN</text>')
source=re.sub(r'<svg id="region".*?</svg>',lambda _:svg,source,flags=re.S)
source=re.sub(r'const areas=.*?;let selected',lambda _:'const areas='+json.dumps(areas)+';let selected',source,flags=re.S)
source=source.replace('11 living areas','12 living areas').replace('Review draft 04','Review draft 05').replace('Roads and water:','Roads: <a href="https://www.txdot.gov/data-maps/roadway-inventory.html" target="_blank" rel="noopener">TxDOT network, November 1, 2026</a>. Water and boundaries:')
source=source.replace('ZIP areas ${a.zips.join(\' · \')}','${a.zips.length ? \'ZIP areas \'+a.zips.join(\' · \') : \'Municipal footprint · featured areas excluded\'}')
source=source.replace('Living areas are simplified, grouped 2020 Census ZIP Code Tabulation Areas, not exact neighborhood, city, school, or USPS boundaries.','Living areas use grouped 2020 Census ZIP Code Tabulation Areas, not exact neighborhood or school boundaries. The San Antonio background uses the Census municipal footprint, with separately featured areas removed to prevent overlap. Stone Oak / Encino Park includes ZIPs 78258, 78259, and 78260; it is broader than those neighborhoods.')
source=source.replace('stroke-width:1.35;opacity:.7','stroke-width:1.65;opacity:.85').replace('stroke-width:5;stroke-linejoin','stroke-width:3;stroke-linejoin')
(p/'map-v5.html').write_text(source,encoding='utf-8')
css=re.search(r'<style>(.*?)</style>',source,re.S).group(1)
(p/'map-v5.svg').write_text(svg.replace('</desc>','</desc><style>'+css+'</style>'),encoding='utf-8')
(p/'label-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));print('Routes',list(rgeom));print('features',len(roads['features']))
