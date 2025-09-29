// Error Component
 const ErrorComponent = ({ message, onRetry, className = '' }) => (
  <div className={`error ${className}`}>
    {message}
    {onRetry && (
      <br />
    )}
    {onRetry && (
      <button className="retry-btn" onClick={onRetry}>
        إعادة المحاولة
      </button>
    )}
  </div>
);
export default ErrorComponent;