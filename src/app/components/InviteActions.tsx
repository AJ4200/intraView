"use client";

import Link from "next/link";
import { useState } from "react";
import { buildInviteText, buildMailto } from "@/lib/inviteEmail";
import InviteQr from "./InviteQr";
import { CopyIcon, LinkIcon, LiveIcon, MailIcon } from "./InviteIcons";

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

export function InviteEmailAction({ candidateEmail, candidateName, jobTitle, recruiterName, timeLimitMinutes, dueAt, inviteLink }: InviteActionsProps) {
  if (!candidateEmail) return <span className="muted">Not provided</span>;
  const email = buildInviteText({ candidateName, jobTitle, recruiterName, timeLimitMinutes, dueAt, link: inviteLink });
  return <a className="table-action email-action" href={buildMailto(candidateEmail, email.subject, email.text)} title={`Email ${candidateName}`}><MailIcon /><span>{candidateEmail}</span></a>;
}

export function InviteLinkAction({ href, kind, candidateName }: { href: string; kind: "invite" | "live"; candidateName: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const label = kind === "invite" ? "Invite link" : "Live link";
  async function copy() {
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(href);
      setMessage(`${label} copied`);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}. Open the link to copy it.`);
    }
  }

  return (
    <div className="invite-link-action">
      <div className="table-action-group">
        {kind === "invite" ? <a className="table-action" href={href} aria-label={`Open invite for ${candidateName}`}><LinkIcon /> Open</a> : <Link className="table-action" href={href} aria-label={`Open live view for ${candidateName}`}><LiveIcon /> Open</Link>}
        <button type="button" className="table-icon-button" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()} for ${candidateName}`} title={`Copy ${label.toLowerCase()}`}><CopyIcon /></button>
      </div>
      {message && <span className="muted" role="status">{message}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export default function InviteActions(props: InviteActionsProps) {
  return (
    <div className="invite-actions">
      <InviteEmailAction {...props} />
      <InviteLinkAction href={props.inviteLink} kind="invite" candidateName={props.candidateName} />
      <InviteLinkAction href={props.liveLink} kind="live" candidateName={props.candidateName} />
      <InviteQr token={props.token} candidateName={props.candidateName} />
    </div>
  );
}
