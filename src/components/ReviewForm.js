import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createReview, updateReview } from '../utils/firebaseFunctions';

export default function ReviewForm({ listingId, onReviewAdded, mode = 'create', reviewId, initialRating = 5, initialComment = '', onCancel }) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRating(initialRating);
    setComment(initialComment);
  }, [initialRating, initialComment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'edit' && reviewId) {
        await updateReview(reviewId, {
          rating,
          comment: comment.trim()
        });
      } else {
      await createReview({
        listingId,
        guestId: currentUser.uid,
        guestName: currentUser.displayName || currentUser.email,
        rating,
        comment: comment.trim()
      });
      }

      setComment('');
      setRating(5);
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error) {
      console.error('Error creating review:', error);
      setError('Failed to submit review: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{mode === 'edit' ? 'Update your review' : 'Write a Review'}</h3>
        {mode === 'edit' && onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows="4"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Share your experience..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}

