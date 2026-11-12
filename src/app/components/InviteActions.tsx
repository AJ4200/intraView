"use client";

import Link from "next/link";
import { useState } from "react";
import { buildInviteText, buildMailto } from "@/lib/inviteEmail";
import InviteQr from "./InviteQr";

interface InviteActionsProps {
  token: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  recruiterName: string;
  timeLimitMinutes: number | null;
  dueAt: number | null;
  inviteLink: string;
  liveLink: string;
}

export default function InviteActions(props: InviteActionsProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const email = buildInviteText({
    candidateName: props.candidateName,
    jobTitle: props.jobTitle,
    recruiterName: props.recruiterName,
    timeLimitMinutes: props.timeLimitMinutes,
    dueAt: props.dueAt,
    link: props.inviteLink,
  });

  async function copy(value: string, label: string) {
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied`);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}. Copy it from the link instead.`);
    }
  }

  return (
    <div className="invite-actions">
      <div className="invite-action-links">
        <a href={props.inviteLink}>Open invite</a>
        <button type="button" onClick={() => void copy(props.inviteLink, "Invite link")}>Copy invite</button>
        <Link href={props.liveLink}>Open live view</Link>
        <button type="button" onClick={() => void copy(props.liveLink, "Live link")}>Copy live link</button>
        {props.candidateEmail && (
          <a href={buildMailto(props.candidateEmail, email.subject, email.text)}>Email candidate</a>
        )}
      </div>
      <InviteQr token={props.token} candidateName={props.candidateName} />
      {message && <span className="muted" role="status">{message}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
