export function resetRankingsFilters(actions: {
  setRankingTab: (value: "vendors" | "robots") => void;
  setMeetupId: (value: string) => void;
  setSearch: (value: string) => void;
  setCountry: (value: string) => void;
  setState: (value: string) => void;
  setSort: (value: string) => void;
  setVisibleCount: (value: number) => void;
}, firstMeetupId: string) {
  actions.setRankingTab("vendors");
  actions.setMeetupId(firstMeetupId);
  actions.setSearch("");
  actions.setCountry("");
  actions.setState("");
  actions.setSort("priority");
  actions.setVisibleCount(100);
}
