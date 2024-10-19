import React from 'react';
import { useParams } from 'react-router-dom';

const PostDetailPage = () => {
  const { id } = useParams();

  return (
    <div>
      <h1>Post Detail</h1>
      <p>Viewing post with ID: {id}</p>
      {/* Post details will go here */}
    </div>
  );
};

export default PostDetailPage;
