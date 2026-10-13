"use client";

import { useState } from "react";
import { ChatTextIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Card, CardHeader, OutlineButton, PrimaryButton } from "@/components/shared/project-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { ConfirmDialog, fieldClass } from "@/components/shared/workspace-ui";
import { usePeople } from "@/hooks/use-projects";
import { useMe } from "@/hooks/use-me";
import { useAddComment, useComments, useDeleteComment, useEditComment } from "@/hooks/use-workspace";
import { formatAgo } from "@/lib/format";
import type { Comment } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

const minutesSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60_000;
const MAX = 2000;

/** Text box with a send button; validates length before sending. */
function Composer({ placeholder, submitLabel, initial = "", pending, onSubmit, onCancel, autoFocus }: { placeholder: string; submitLabel: string; initial?: string; pending?: boolean; onSubmit: (body: string, reset: () => void) => void; onCancel?: () => void; autoFocus?: boolean }) {
  const [body, setBody] = useState(initial);
  const [error, setError] = useState("");
  const send = () => {
    const text = body.trim();
    if (text.length < 2) return setError("Write a little more before sending");
    if (text.length > MAX) return setError(`Keep it under ${MAX.toLocaleString()} characters`);
    onSubmit(text, () => setBody(""));
  };
  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        rows={3}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={!!error}
        autoFocus={autoFocus}
        className={cn(fieldClass, "h-auto resize-y py-2 leading-5")}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {error ? (
          <p role="alert" className="text-[12px] font-medium text-[#DC2626]">
            {error}
          </p>
        ) : (
          <p className="text-[11.5px] text-ink-muted">Ctrl + Enter to send</p>
        )}
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <OutlineButton className="h-8" onClick={onCancel}>
              Cancel
            </OutlineButton>
          )}
          <PrimaryButton className="h-8 px-3.5" onClick={send} disabled={pending}>
            {submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ c, replies, projectId, reply }: { c: Comment; replies?: Comment[]; projectId: string; reply: boolean }) {
  const me = useMe();
  const { data: people } = usePeople();
  const add = useAddComment();
  const edit = useEditComment();
  const remove = useDeleteComment();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const author = people?.find((p) => p.id === c.authorId);
  const mine = c.authorId === me.id;

  return (
    <li className={cn(reply ? "mt-3" : "border-t border-line-soft pt-4 first:border-t-0 first:pt-0")}>
      <div className="flex gap-3">
        {author && <PersonAvatar name={author.name} src={author.avatar} size={reply ? "sm" : "md"} />}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
            <span className="font-semibold text-ink">{author?.name ?? "Someone"}</span>
            <time dateTime={c.createdAt} className="text-[12px] text-ink-muted" title={new Date(c.createdAt).toLocaleString()}>
              {formatAgo(minutesSince(c.createdAt))}
            </time>
            {c.editedAt && <span className="text-[11.5px] text-ink-muted">(edited)</span>}
          </p>
          {editing ? (
            <div className="mt-2">
              <Composer
                initial={c.body}
                placeholder="Edit your comment"
                submitLabel="Save"
                autoFocus
                pending={edit.isPending}
                onCancel={() => setEditing(false)}
                onSubmit={(body) =>
                  edit.mutate(
                    { id: c.id, body },
                    {
                      onSuccess: () => {
                        setEditing(false);
                        toast.success("Comment updated");
                      },
                      onError: (err) => toast.error("Couldn't save the comment", { description: err.message }),
                    },
                  )
                }
              />
            </div>
          ) : (
            <p className="mt-1 text-[13.5px] leading-[21px] whitespace-pre-wrap text-ink-body">{c.body}</p>
          )}
          {!editing && (
            <div className="mt-1.5 flex gap-3 text-[12px]">
              {!reply && (
                <button type="button" onClick={() => setReplying((r) => !r)} className="rounded font-medium text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                  Reply
                </button>
              )}
              {mine && (
                <>
                  <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded font-medium text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    <PencilSimpleIcon size={12} aria-hidden /> Edit
                  </button>
                  <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 rounded font-medium text-ink-muted hover:text-[#DC2626] focus-visible:outline-2 focus-visible:outline-brand-action">
                    <TrashIcon size={12} aria-hidden /> Delete
                  </button>
                </>
              )}
            </div>
          )}
          {replies && replies.length > 0 && (
            <ul className="mt-1 border-l-2 border-line-soft pl-4">
              {replies.map((r) => (
                <CommentItem key={r.id} c={r} projectId={projectId} reply />
              ))}
            </ul>
          )}
          {replying && (
            <div className="mt-3 border-l-2 border-line-soft pl-4">
              <Composer
                placeholder={`Reply to ${author?.name ?? "this comment"}`}
                submitLabel="Reply"
                autoFocus
                pending={add.isPending}
                onCancel={() => setReplying(false)}
                onSubmit={(body, reset) =>
                  add.mutate(
                    { projectId, body, parentId: c.id },
                    {
                      onSuccess: () => {
                        reset();
                        setReplying(false);
                      },
                      onError: (err) => toast.error("Couldn't post the reply", { description: err.message }),
                    },
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this comment?"
        description={replies?.length ? "Its replies are deleted too." : "This can't be undone."}
        confirmLabel="Delete comment"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(c.id, {
            onSuccess: () => {
              setConfirm(false);
              toast.success("Comment deleted");
            },
            onError: (err) => toast.error("Couldn't delete the comment", { description: err.message }),
          })
        }
      />
    </li>
  );
}

/** A project's conversation: comments oldest first, each with its replies. */
export function ProjectDiscussion({ projectId }: { projectId: string }) {
  const { data, isPending } = useComments(projectId);
  const add = useAddComment();
  const top = (data ?? []).filter((c) => !c.parentId);
  const repliesOf = (id: string) => (data ?? []).filter((c) => c.parentId === id);
  return (
    <Card label="Discussion">
      <CardHeader title={`Discussion${data ? ` (${data.length})` : ""}`} />
      <div className="px-5 pb-5">
        {isPending ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : top.length ? (
          <ul>
            {top.map((c) => (
              <CommentItem key={c.id} c={c} replies={repliesOf(c.id)} projectId={projectId} reply={false} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={ChatTextIcon} title="No comments yet" hint="Start the conversation for this project." className="py-8" />
        )}
        <div className="mt-5 border-t border-line-soft pt-4">
          <Composer
            placeholder="Write a comment…"
            submitLabel="Comment"
            pending={add.isPending}
            onSubmit={(body, reset) =>
              add.mutate(
                { projectId, body, parentId: null },
                {
                  onSuccess: () => reset(),
                  onError: (err) => toast.error("Couldn't post the comment", { description: err.message }),
                },
              )
            }
          />
        </div>
      </div>
    </Card>
  );
}
