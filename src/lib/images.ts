// Editorial imagery (Unsplash CDN). Every <Img> has a graceful fallback if a photo fails to load.
const u = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMG = {
  recipes: u("photo-1504674900247-0877df9cc836"),
  booking: u("photo-1582719478250-c89cae4dc85b"),
  bookingPool: u("photo-1566073771259-6a8506099945"),
  travel: u("photo-1507525428034-b723cf961d3e"),
  travelPlan: u("photo-1488646953014-85cb44e25828"),
  discover: u("photo-1517248135467-4c7edcad34c4"),
  cafe: u("photo-1501339847302-ac426a4a7cbb"),
  schedule: u("photo-1506784983877-45594efa4cbe"),
  finance: u("photo-1554224155-6726b3ff858f"),
  news: u("photo-1504711434969-e33886168f5c", 2000),
  fashion: u("photo-1490481651871-ab68de25d43d"),
  fashionRack: u("photo-1445205170230-053b83016050"),
  flights: u("photo-1436491865332-7a61a109cc05"),
  car: u("photo-1449965408869-eaa3f722e40d"),
  attractions: u("photo-1502602898657-3e91760cbb34"),
  auth: u("photo-1566073771259-6a8506099945", 1600),
};
