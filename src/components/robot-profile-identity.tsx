export function RobotProfileIdentity({ robotName, vendorName, vendorHref, researchStatus }: { robotName: string; vendorName: string; vendorHref: string; researchStatus: string }) {
  return <><h2>{robotName}</h2><p><b>Vendor:</b> <a className="link" href={vendorHref}>{vendorName}</a> · <span className="badge">{researchStatus}</span></p></>;
}
