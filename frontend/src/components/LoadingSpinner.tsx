interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
}
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  message = "Loading...",
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
      {" "}
      <div className={`relative inline-block ${sizeClasses[size]}`}>
        {" "}
        <div className="w-full h-full border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>{" "}
      </div>{" "}
      {message && (
        <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
      )}{" "}
    </div>
  );
};
export default LoadingSpinner;
