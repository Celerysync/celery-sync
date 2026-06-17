import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

export function useCommunity(authUser) {
  const [circles, setCircles] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [posts, setPosts] = useState([]);
  const [myLikes, setMyLikes] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const loadCircles = useCallback(async () => {
    const { data } = await supabase.from("circles").select("*").order("name");
    if (data) setCircles(data);
  }, []);

  const loadMyMemberships = useCallback(async () => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("circle_members")
      .select("*")
      .eq("user_id", authUser.id);
    if (data) setMyMemberships(data);
  }, [authUser?.id]);

  const joinCircle = useCallback(async (circleId, alias, avatarEmoji) => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("circle_members")
      .upsert({ user_id: authUser.id, circle_id: circleId, alias, avatar_emoji: avatarEmoji }, { onConflict: "user_id,circle_id" })
      .select().single();
    if (data) setMyMemberships((prev) => [...prev.filter((m) => m.circle_id !== circleId), data]);
    return data;
  }, [authUser?.id]);

  const leaveCircle = useCallback(async (circleId) => {
    if (!authUser?.id) return;
    await supabase.from("circle_members").delete()
      .eq("user_id", authUser.id).eq("circle_id", circleId);
    setMyMemberships((prev) => prev.filter((m) => m.circle_id !== circleId));
  }, [authUser?.id]);

  const loadPosts = useCallback(async (circleId) => {
    setLoading(true);
    const { data } = await supabase
      .from("circle_posts")
      .select("*")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data);

    // Load my likes for these posts
    if (authUser?.id && data?.length) {
      const { data: likes } = await supabase
        .from("circle_post_likes")
        .select("post_id")
        .eq("user_id", authUser.id)
        .in("post_id", data.map((p) => p.id));
      if (likes) setMyLikes(new Set(likes.map((l) => l.post_id)));
    }
    setLoading(false);
  }, [authUser?.id]);

  const createPost = useCallback(async ({ circleId, content, postType, energyToday, alias, avatarEmoji }) => {
    if (!authUser?.id) return;
    const { data, error } = await supabase
      .from("circle_posts")
      .insert({
        circle_id: circleId,
        user_id: authUser.id,
        alias,
        avatar_emoji: avatarEmoji,
        post_type: postType || "update",
        content,
        energy_today: energyToday || null,
      })
      .select().single();
    if (!error && data) {
      setPosts((prev) => [data, ...prev]);
    }
    return data;
  }, [authUser?.id]);

  const toggleLike = useCallback(async (postId) => {
    if (!authUser?.id) return;
    const liked = myLikes.has(postId);
    if (liked) {
      await supabase.from("circle_post_likes").delete()
        .eq("user_id", authUser.id).eq("post_id", postId);
      setMyLikes((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
      await supabase.from("circle_posts").update({ likes: posts.find(p => p.id === postId)?.likes - 1 }).eq("id", postId);
    } else {
      await supabase.from("circle_post_likes").insert({ user_id: authUser.id, post_id: postId });
      setMyLikes((prev) => new Set([...prev, postId]));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
      await supabase.from("circle_posts").update({ likes: (posts.find(p => p.id === postId)?.likes || 0) + 1 }).eq("id", postId);
    }
  }, [authUser?.id, myLikes, posts]);

  const deletePost = useCallback(async (postId) => {
    if (!authUser?.id) return;
    await supabase.from("circle_posts").delete()
      .eq("id", postId).eq("user_id", authUser.id);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, [authUser?.id]);

  const getMembership = (circleId) => myMemberships.find((m) => m.circle_id === circleId) || null;

  return {
    circles, myMemberships, posts, myLikes, loading,
    loadCircles, loadMyMemberships, joinCircle, leaveCircle,
    loadPosts, createPost, toggleLike, deletePost, getMembership,
  };
}
