import { useState } from "react";

export const useEventReview = () => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [organizerReviewOpen, setOrganizerReviewOpen] = useState(false);

  return {
    rating,
    setRating,
    review,
    setReview,
    reviewSubmitted,
    setReviewSubmitted,
    organizerReviewOpen,
    setOrganizerReviewOpen,
  };
};
