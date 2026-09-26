type MeetupRef = { id: string };
type OpportunityMeetupRef = { meetup_id: string | null };

export function nextMeetupSelection(currentId: string, meetups: MeetupRef[], opportunities: OpportunityMeetupRef[]) {
  if (meetups.some((meetup) => meetup.id === currentId)) return currentId;
  if (opportunities.some((opportunity) => opportunity.meetup_id === null)) return "";
  return meetups[0]?.id || "";
}

export function opportunitiesForMeetup<T extends OpportunityMeetupRef>(opportunities: T[], meetupId: string) {
  return opportunities.filter((opportunity) => opportunity.meetup_id === (meetupId || null));
}

export function meetupDeleteConfirmation(name: string, linkedOpportunityCount: number) {
  return `Delete ${name}? ${linkedOpportunityCount} linked ${linkedOpportunityCount === 1 ? "opportunity" : "opportunities"} and their history will be kept without a Meetup.`;
}
