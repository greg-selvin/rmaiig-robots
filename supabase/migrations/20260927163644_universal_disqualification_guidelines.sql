alter table public.workspaces
add column disqualification_guidelines text not null default $guidelines$## Hard disqualifiers

A "No" to any question below removes the vendor from consideration.

1. **Availability and location.** Can you bring the robot to our event in the Boulder/Denver area on [date]?
2. **Cost.** Will you participate at no charge to RMAIIG (no demo, travel, or appearance fees)?
3. **On-site operator.** Will a trained operator from your team be present and running the robot for the entire event?

- Why: we can't take responsibility for operating or supervising someone else's hardware.

4. **Real autonomy.** Does the robot use autonomous capabilities during the demo (for example, live perception, navigation, or learned behaviors) rather than relying only on remote control or pre-programmed scripts? If any part of the demo is teleoperated, will you tell attendees?

- Why: keeps the demo relevant to an AI audience and honest about what they're seeing.

5. **Works offline.** Can the robot run its full demo without internet if the venue's Wi-Fi or cellular connection fails?

- Why: crowded rooms routinely overload networks.

6. **Physical logistics and power.** Does the robot fit through a standard commercial doorway and reach the room by elevator or ramp if needed? Does it run and charge on standard wall power (120V/15A)? Can you legally transport its batteries to the venue?

- Why: filters out units needing freight handling, special power, or hazardous materials shipping.

7. **Crowd safety.** Does the robot have an easy-to-reach hardware emergency stop (E-Stop), plus either automatic collision avoidance or a physical barrier or safety zone plan for the demo?
8. **Insurance.** Can you provide a Certificate of Insurance for commercial general liability covering an off-site live demo, naming the venue and RMAIIG as additional insured?$guidelines$;
