insert into public.meetups(workspace_id,name,city,state,country,description,status)
values ('c02ee290-4f87-4d1f-98c1-24c502126086','Boulder Humanoid Robotics Meetup','Boulder','CO','US','In-person Meetup for humanoid robotics demonstrations and conversation.','planning');
insert into public.pipeline_stages(workspace_id,name,position,color) values
('c02ee290-4f87-4d1f-98c1-24c502126086','Researching',1,'#64748b'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Contact identified',2,'#06b6d4'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Outreach planned',3,'#3b82f6'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Contacted',4,'#8b5cf6'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Responded',5,'#a855f7'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Interested',6,'#14b8a6'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Logistics review',7,'#eab308'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Confirmed',8,'#22c55e'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Declined',9,'#ef4444'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Deferred',10,'#f97316');
insert into public.scoring_models(workspace_id,kind,version,is_active) values
('c02ee290-4f87-4d1f-98c1-24c502126086','excitement',1,true),
('c02ee290-4f87-4d1f-98c1-24c502126086','participation',1,true);
insert into public.scoring_criteria(workspace_id,model_id,criterion_key,label,description,weight,position)
select m.workspace_id,m.id,v.key,v.label,v.description,v.weight,v.position
from public.scoring_models m join (values
('excitement','live_impact','Live demonstration impact','How impressive its movements and capabilities appear in person.',25,1),
('excitement','attendee_interaction','Attendee interaction','Whether attendees can speak with it, direct it, or hand it objects.',25,2),
('excitement','sophistication','Capability sophistication','Mobility, manipulation, dexterity, autonomy, perception and conversation.',15,3),
('excitement','distinctiveness','Distinctiveness','What makes this robot noticeably different.',15,4),
('excitement','demo_range','Demonstration range','Whether it can perform several interesting actions.',10,5),
('excitement','audience_appeal','Audience and promotional appeal','Likely effect on attendance and word of mouth.',10,6),
('participation','manufacturer_benefit','Benefit to the manufacturer','Recruiting, publicity, customer exposure or research relationships.',20,1),
('participation','geographic_feasibility','Geographic feasibility','Distance, transport complexity and nearby teams.',20,2),
('participation','demo_readiness','Demonstration readiness','Reliability, safety, transportability and preparation.',20,3),
('participation','event_history','Public-event history','Evidence of conferences, universities or community events.',15,4),
('participation','accessibility','Organizational accessibility','Ability to reach someone who could approve participation.',15,5),
('participation','meetup_fit','Meetup fit','Alignment of an in-person technical Meetup with manufacturer goals.',10,6)
) v(kind,key,label,description,weight,position) on v.kind=m.kind where m.version=1;
insert into public.email_templates(workspace_id,name,subject,body) values
('c02ee290-4f87-4d1f-98c1-24c502126086','Initial invitation','Invitation: {{robot_name}} at {{meetup_name}}','Hello {{contact_first_name}},\n\nI help organize {{meetup_name}} in {{city}}. We would love to explore an in-person demonstration of {{robot_name}} with our robotics community. Would someone at {{vendor_name}} be open to a conversation?\n\n{{custom_note}}\n\nBest,\n{{sender_name}}\n{{sender_role}}'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Follow-up','Following up: {{meetup_name}}','Hello {{contact_first_name}},\n\nI wanted to follow up on the invitation for {{robot_name}} to join {{meetup_name}} in {{city}}. Would a brief call be useful?\n\nBest,\n{{sender_name}}'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Request for the correct contact','Who handles events at {{vendor_name}}?','Hello,\n\nWho would be the best person to discuss an in-person {{robot_name}} demonstration at {{meetup_name}} in {{city}}?\n\nThank you,\n{{sender_name}}'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Logistics follow-up','Logistics for {{robot_name}} in {{city}}','Hello {{contact_first_name}},\n\nCould we review transport, power, space, safety and staffing for a possible {{robot_name}} demonstration at {{meetup_name}}?\n\nBest,\n{{sender_name}}'),
('c02ee290-4f87-4d1f-98c1-24c502126086','Confirmation','Confirming {{robot_name}} for {{meetup_name}}','Hello {{contact_first_name}},\n\nThank you for working with us on {{robot_name}} at {{meetup_name}}. Please confirm the date, venue and demonstration requirements before we announce participation.\n\nBest,\n{{sender_name}}');
