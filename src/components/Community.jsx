import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useCommunity } from "../hooks/useCommunity.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

const AVATARS = ["🌿","🌸","🌺","💫","🌙","☀️","🦋","🌻","🍃","💚","🌈","⭐","🫐","🍋","🌾"];

const POST_TYPES = [
  { id: "update",   emoji: "📋", label: "Healing update" },
  { id: "question", emoji: "🙋", label: "Question"       },
  { id: "win",      emoji: "🎉", label: "Win!"           },
  { id: "recipe",   emoji: "🥗", label: "Recipe / tip"  },
];

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PostCard({ post, myLikes, onLike, onDelete, isOwn, replies, onLoadReplies, onReply, membership }) {
  const liked = myLikes.has(post.id);
  const type = POST_TYPES.find((t) => t.id === post.post_type) || POST_TYPES[0];
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const postReplies = replies?.[post.id] || [];

  const toggleReplies = () => {
    if (!showReplies && postReplies.length === 0) onLoadReplies(post.id);
    setShowReplies((v) => !v);
  };

  const submitReply = async () => {
    if (!replyText.trim() || !membership) return;
    setReplying(true);
    await onReply({ postId: post.id, content: replyText.trim(), alias: membership.alias, avatarEmoji: membership.avatar_emoji });
    setReplyText("");
    setReplying(false);
  };

  return (
    <div style={{
      background: C.white, borderRadius: 16, padding: 16,
      border: `1px solid ${C.border}`, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>{post.avatar_emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
            {post.alias}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {type.emoji} {type.label} · {timeAgo(post.created_at)}
          </div>
        </div>
        {post.energy_today && (
          <div style={{
            background: C.sageLight, borderRadius: 20, padding: "3px 10px",
            fontSize: 11, color: C.sageDark, fontWeight: 700, flexShrink: 0,
          }}>
            Energy {post.energy_today}/10
          </div>
        )}
      </div>

      <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.75, marginBottom: 10 }}>
        {post.content}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: liked ? C.sageLight : "transparent",
            border: `1px solid ${liked ? C.sage : C.border}`,
            borderRadius: 20, padding: "5px 12px", cursor: "pointer",
            fontSize: 12, color: liked ? C.sage : C.muted,
            fontFamily: "Georgia,serif", fontWeight: liked ? 700 : 400,
          }}
        >
          💚 {post.likes || 0}
        </button>
        {membership && (
          <button
            onClick={toggleReplies}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: showReplies ? C.sageLight : "transparent",
              border: `1px solid ${showReplies ? C.sage : C.border}`,
              borderRadius: 20, padding: "5px 12px", cursor: "pointer",
              fontSize: 12, color: showReplies ? C.sage : C.muted,
              fontFamily: "Georgia,serif",
            }}
          >
            💬 {post.reply_count || postReplies.length || 0}
          </button>
        )}
        {isOwn && (
          <button
            onClick={() => onDelete(post.id)}
            style={{
              background: "none", border: "none", color: C.muted,
              fontSize: 11, cursor: "pointer", marginLeft: "auto",
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Replies section */}
      {showReplies && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {postReplies.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>{r.avatar_emoji}</div>
              <div style={{ flex: 1, background: C.mist, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDark, marginBottom: 2, fontFamily: "Georgia,serif" }}>
                  {r.alias} · {timeAgo(r.created_at)}
                </div>
                <div style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.5 }}>{r.content}</div>
              </div>
            </div>
          ))}
          {membership && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-end" }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply with love…"
                rows={2}
                style={{
                  flex: 1, borderRadius: 10, border: `1.5px solid ${C.border}`,
                  padding: "8px 12px", fontFamily: "Georgia,serif", fontSize: 12.5,
                  color: C.charcoal, resize: "none", outline: "none",
                }}
              />
              <button
                onClick={submitReply}
                disabled={replying || !replyText.trim()}
                style={{
                  background: C.sage, color: C.white, border: "none",
                  borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                  opacity: replyText.trim() ? 1 : 0.5,
                }}
              >
                {replying ? "…" : "Reply"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JoinModal({ circle, onJoin, onClose, savedAlias, savedAvatar }) {
  const [alias, setAlias] = useState(savedAlias || "Healer");
  const [avatar, setAvatar] = useState(savedAvatar || "🌿");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000055",
      zIndex: 50, display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.white, borderRadius: "24px 24px 0 0",
        padding: 24, width: "100%", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginBottom: 6 }}>
          {circle.emoji} Join {circle.name}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Choose a display name and avatar — your real name is never shown. You are anonymous in all circles.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Your circle name</div>
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="e.g. Healing Soul, Warrior, or just Healer"
            maxLength={30}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 14px",
              borderRadius: 10, border: `1.5px solid ${C.border}`,
              fontFamily: "Georgia,serif", fontSize: 14, color: C.charcoal, outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Your avatar</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  fontSize: 26, width: 44, height: 44, borderRadius: 12, border: "none",
                  background: avatar === a ? C.sageLight : C.mist,
                  cursor: "pointer",
                  boxShadow: avatar === a ? `0 0 0 2px ${C.sage}` : "none",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <Btn full onClick={() => onJoin(alias.trim() || "Healer", avatar)} color={C.sage}>
          Join {circle.name}
        </Btn>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 10, background: "none", border: "none",
            color: C.muted, fontSize: 13, cursor: "pointer", padding: "8px 0",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewPostModal({ circle, membership, onPost, onClose }) {
  const [type, setType] = useState("update");
  const [content, setContent] = useState("");
  const [energy, setEnergy] = useState(null);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await onPost({
      postType: type,
      content: content.trim(),
      energyToday: type === "update" ? energy : null,
      alias: membership.alias,
      avatarEmoji: membership.avatar_emoji,
    });
    setPosting(false);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000055",
      zIndex: 50, display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.white, borderRadius: "24px 24px 0 0",
        padding: 24, width: "100%", maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 24 }}>{membership.avatar_emoji}</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              {membership.alias}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>posting to {circle.emoji} {circle.name}</div>
          </div>
        </div>

        {/* Post type */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {POST_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                fontFamily: "Georgia,serif", fontSize: 12,
                background: type === t.id ? C.sage : C.mist,
                color: type === t.id ? C.white : C.charcoal,
                fontWeight: type === t.id ? 700 : 400,
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Energy for updates */}
        {type === "update" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>
              Energy today? <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[2,4,6,8,10].map((v) => (
                <button
                  key={v}
                  onClick={() => setEnergy(energy === v ? null : v)}
                  style={{
                    flex: 1, padding: "7px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: energy === v ? C.leaf : C.mist,
                    color: energy === v ? C.white : C.charcoal, fontSize: 12,
                    fontFamily: "Georgia,serif", fontWeight: 700,
                  }}
                >
                  {v}/10
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "update" ? "Share how your healing is going today…"
            : type === "question" ? "What would you like to ask the circle?"
            : type === "win" ? "Share your win — no matter how small, it matters!"
            : "Share a recipe, food combination, or healing tip…"
          }
          rows={5}
          maxLength={600}
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px",
            borderRadius: 12, border: `1.5px solid ${C.border}`,
            fontFamily: "Georgia,serif", fontSize: 14, color: C.charcoal,
            background: C.white, resize: "none", outline: "none", marginBottom: 6,
          }}
        />
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, textAlign: "right" }}>
          {content.length}/600
        </div>

        <div style={{ background: C.sageLight, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: C.sageDark }}>
          🌿 Community guidelines: Be kind and supportive. Share from your own experience. No medical advice — only AW teachings and personal journeys. This is a safe, healing space.
        </div>

        <Btn full onClick={handlePost} disabled={posting || !content.trim()} color={C.sage}>
          {posting ? "Sharing…" : "Share with the Circle"}
        </Btn>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 10, background: "none", border: "none",
            color: C.muted, fontSize: 13, cursor: "pointer", padding: "8px 0",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CircleView({ circle, authUser, useCom, onBack }) {
  const { posts, myLikes, replies, loading, loadPosts, createPost, toggleLike, deletePost, getMembership, joinCircle, leaveCircle, loadReplies, createReply } = useCom;
  const membership = getMembership(circle.id);
  const [showJoin, setShowJoin] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [savedAlias] = useLocalStorage("cs_circle_alias", "Healer");
  const [savedAvatar] = useLocalStorage("cs_circle_avatar", "🌿");

  useEffect(() => { loadPosts(circle.id); }, [circle.id]);

  const handleJoin = async (alias, avatar) => {
    await joinCircle(circle.id, alias, avatar);
    setShowJoin(false);
    loadPosts(circle.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.sage, fontSize: 13, cursor: "pointer", padding: "0 0 10px", fontFamily: "Georgia,serif" }}
        >
          ← All Circles
        </button>
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 18, padding: "18px 18px 14px", color: C.white,
        }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>{circle.emoji}</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20 }}>{circle.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>{circle.description}</div>
        </div>
      </div>

      {/* Join / Post actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {membership ? (
          <>
            <Btn full onClick={() => setShowPost(true)} color={C.sage}>
              ✍️ Share with the Circle
            </Btn>
            <button
              onClick={() => leaveCircle(circle.id)}
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 30,
                padding: "11px 14px", fontSize: 12, color: C.muted, cursor: "pointer",
                fontFamily: "Georgia,serif", flexShrink: 0,
              }}
            >
              Leave
            </button>
          </>
        ) : (
          <Btn full onClick={() => setShowJoin(true)} color={C.plum}>
            💜 Join This Circle
          </Btn>
        )}
      </div>

      {/* Guidelines */}
      {!membership && (
        <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40`, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
            🌿 <strong>Anonymous & safe.</strong> Join to share and connect — your real name is never shown. Read posts freely, share when you're ready.
          </div>
        </Card>
      )}

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: C.muted, fontFamily: "Georgia,serif" }}>🌿 Loading…</div>
      ) : posts.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>{circle.emoji}</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
            Be the first to share
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            This circle is waiting for its first post. Join and start the conversation.
          </div>
        </Card>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            myLikes={myLikes}
            onLike={toggleLike}
            onDelete={deletePost}
            isOwn={post.user_id === authUser?.id}
            replies={replies}
            onLoadReplies={loadReplies}
            onReply={createReply}
            membership={membership}
          />
        ))
      )}

      {showJoin && (
        <JoinModal
          circle={circle}
          onJoin={handleJoin}
          onClose={() => setShowJoin(false)}
          savedAlias={savedAlias}
          savedAvatar={savedAvatar}
        />
      )}

      {showPost && membership && (
        <NewPostModal
          circle={circle}
          membership={membership}
          onPost={(data) => createPost({ ...data, circleId: circle.id })}
          onClose={() => setShowPost(false)}
        />
      )}
    </div>
  );
}

export default function Community({ authUser, userProfile }) {
  const useCom = useCommunity(authUser);
  const { circles, myMemberships, loadCircles, loadMyMemberships } = useCom;
  const [activeCircle, setActiveCircle] = useState(null);

  useEffect(() => {
    loadCircles();
    if (authUser) loadMyMemberships();
  }, [authUser?.id]);

  const userConditions = userProfile?.symptoms || [];

  const suggestedCircles = circles.filter((c) =>
    c.condition_tags.some((tag) =>
      userConditions.some((uc) => uc.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(uc.toLowerCase()))
    )
  );
  const otherCircles = circles.filter((c) => !suggestedCircles.find((s) => s.id === c.id));

  if (activeCircle) {
    return (
      <CircleView
        circle={activeCircle}
        authUser={authUser}
        useCom={useCom}
        onBack={() => setActiveCircle(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>
          💚 Healing Circles
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Anonymous community groups — find your people
        </div>
      </div>

      <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
        <div style={{ fontSize: 13, color: C.sageDark, lineHeight: 1.65 }}>
          🌿 <strong>You are never alone in this.</strong> Healing circles are anonymous, supportive spaces for people on the Medical Medium path. Share your journey, ask questions, celebrate wins, and receive encouragement.
        </div>
      </Card>

      {/* My circles */}
      {myMemberships.length > 0 && (
        <>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginTop: 4 }}>
            My Circles
          </div>
          {circles.filter((c) => myMemberships.find((m) => m.circle_id === c.id)).map((c) => (
            <Card key={c.id} onClick={() => setActiveCircle(c)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 30, flexShrink: 0 }}>{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {myMemberships.find((m) => m.circle_id === c.id)?.alias} · tap to open
                  </div>
                </div>
                <div style={{ fontSize: 11, background: C.sage, color: C.white, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>Member</div>
                <div style={{ color: C.sage, fontSize: 20 }}>›</div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Suggested for you */}
      {suggestedCircles.length > 0 && (
        <>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginTop: 4 }}>
            Suggested for you
          </div>
          {suggestedCircles.map((c) => (
            <Card key={c.id} onClick={() => setActiveCircle(c)} style={{ cursor: "pointer", border: `1.5px solid ${C.sage}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{c.description.slice(0, 80)}…</div>
                </div>
                <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* All other circles */}
      {otherCircles.length > 0 && (
        <>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginTop: 4 }}>
            All Circles
          </div>
          {otherCircles.map((c) => (
            <Card key={c.id} onClick={() => setActiveCircle(c)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{c.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{c.description.slice(0, 80)}…</div>
                </div>
                <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
