/**
 * Fetch Cebu municipalities directly from OpenStreetMap via Overpass API
 * This gets live OSM data - no gaps/slivers from simplified sources
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

async function fetchCebuMunicipalities() {
  // Query: All admin_level=8 (municipalities) within Cebu Province (relation 535822)
  const query = `
[out:json][timeout:60];
area["admin_level"="4"]["name"="Cebu"]["ISO3166-2"="PH-07"]->.cebu;
(
  relation["boundary"="administrative"]["admin_level"=8](area.cebu);
  relation["boundary"="administrative"]["admin_level"=9](area.cebu);
);
out geom;
`;

  console.log('Fetching Cebu municipalities from OSM...');
  
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: query
  });

  if (!response.ok) {
    throw new Error(`OSM query failed: ${response.status}`);
  }

  const data = await response.json();
  
  console.log(`Found ${data.elements.length} elements`);
  
  // Convert to GeoJSON
  const features = [];
  
  for (const el of data.elements) {
    if (el.type !== 'relation' || !el.members) continue;
    
    // Extract name from tags
    const name = el.tags?.name || el.tags?.['official_name'];
    const psgc = el.tags?.psgc;
    
    // Get the outer polygon from relation members
    const outerMembers = el.members.filter(m => 
      m.type === 'way' && m.role === 'outer'
    );
    
    if (outerMembers.length === 0) continue;
    
    // Build coordinates from all outer ways
    const allCoords = [];
    for (const member of outerMembers) {
      // Find the full way details
      const way = data.elements.find(e => 
        e.type === 'way' && e.id === member.ref
      );
      if (way && way.nodes) {
        for (const nodeRef of way.nodes) {
          const node = data.elements.find(e => 
            e.type === 'node' && e.id === nodeRef
          );
          if (node) {
            allCoords.push([node.lon, node.lat]);
          }
        }
      }
    }
    
    if (allCoords.length > 0) {
      features.push({
        type: 'Feature',
        properties: { name, psgc },
        geometry: {
          type: 'Polygon',
          coordinates: [allCoords]
        }
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[2]}`) {
  fetchCebuMunicipalities()
    .then(geojson => {
      console.log(JSON.stringify(geojson, null, 2));
    })
    .catch(console.error);
}

export { fetchCebuMunicipalities };