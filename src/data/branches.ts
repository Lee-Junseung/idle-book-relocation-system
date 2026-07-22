import { Branch } from "../types";

export const BRANCHES: Branch[] = [
  { id: "buksuwon",  name: "북수원도서관",     district: "장안구", hub: true,  distance: 0,   collection: 142840 },
  { id: "central",   name: "수원시립중앙도서관", district: "팔달구", hub: false, distance: 4.1, collection: 218560 },
  { id: "yeongtong", name: "영통도서관",        district: "영통구", hub: false, distance: 8.7, collection:  94320 },
  { id: "gwonseon",  name: "권선도서관",        district: "권선구", hub: false, distance: 6.2, collection:  81740 },
  { id: "mangpo",    name: "망포도서관",        district: "영통구", hub: false, distance: 9.3, collection:  67280 },
  { id: "gwanggyo",  name: "광교도서관",        district: "영통구", hub: false, distance: 5.8, collection: 103450 },
];
