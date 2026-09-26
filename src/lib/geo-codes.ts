import isoCountryData from "./iso-countries.json";
import usStates from "./us-states.json";

export type IsoCountry = { name: string; alpha2: string; alpha3: string };
export type StateCode = { name: string; code: string };

export const isoCountries = (isoCountryData.countries as IsoCountry[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
export const usStateCodes = usStates as StateCode[];
const countryByCode = new Map(isoCountries.flatMap(country => [[country.alpha2,country],[country.alpha3,country]]));
const countryByName = new Map(isoCountries.map(country=>[normalizeLocationText(country.name),country]));

function normalizeLocationText(value:string){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").trim().toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu," ");}

export function countryRecord(value:string|null|undefined):IsoCountry|null{
  if(!value)return null;
  const key=value.trim().toUpperCase().replace(/[.]/g,"");
  const aliases:Record<string,string>={UK:"GBR",UAE:"ARE",GER:"DEU",GR:"GRC","UNITED STATES":"USA","UNITED STATES OF AMERICA":"USA","UNITED STATES OF AMERICA (THE)":"USA","U S":"USA","SOUTH KOREA":"KOR","NORTH KOREA":"PRK"};
  return countryByCode.get(aliases[key]||key)||countryByName.get(normalizeLocationText(value))||null;
}

export function countryCode(value:string|null|undefined):string|null{return countryRecord(value)?.alpha3||null;}
export function isUsCountry(value:string|null|undefined):boolean{return countryCode(value)==="USA";}
export function countryName(value:string|null|undefined):string|null{return countryRecord(value)?.name||null;}
export function countryLabel(value:string|null|undefined):string{
  const country=countryRecord(value);
  return country?country.name+" ("+country.alpha3+")":value||"";
}
export function stateCode(value:string|null|undefined):string|null{
  if(!value)return null;
  const code=value.trim().toUpperCase().replace(/^US-/,"");
  return usStateCodes.some(state=>state.code===code)?code:null;
}
