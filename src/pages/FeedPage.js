import React, { useEffect, useState } from 'react';
import { firestore } from '../firebase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore
      .collection('posts')
      .orderBy('date', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postsData);
      });

    // Clean up the subscription on unmount
    return unsubscribe;
  }, []);

  return (
    <div className={cn("max-w-2xl mx-auto space-y-6 p-4")}>
      {posts.map((post) => (
        <Card key={post.id} className={cn("w-full")}>
          <CardHeader className={cn("space-y-4")}>
            <h2 className={cn("text-2xl font-bold")}>{post.title}</h2>
            <div className={cn("flex items-center space-x-4")}>
              <Avatar>
                <AvatarImage src={post.avatarUrl} alt={post.author} />
                <AvatarFallback>{post.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className={cn("text-sm font-medium")}>{post.author}</p>
                <p className={cn("text-xs text-muted-foreground")}>
                  {new Date(post.date.seconds * 1000).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className={cn("line-clamp-3")}>{post.content}</p>
            <Button variant="link" className={cn("mt-2 p-0")}>
              Read more
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeedPage;
