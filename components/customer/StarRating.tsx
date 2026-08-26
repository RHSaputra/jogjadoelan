import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  terjual?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, terjual, size = "sm" }: StarRatingProps) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${starSize} ${
              i <= rating
                ? "fill-orange-500 text-orange-500"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
      {terjual !== undefined && (
        <span className={`${textSize} text-gray-600`}>
          {rating} | {terjual} terjual
        </span>
      )}
    </div>
  );
}