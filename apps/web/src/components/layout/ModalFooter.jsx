const ModalFooter = ({ children, className = '' }) => {
  return (
    <div
      className={`flex flex-col-reverse md:flex-row md:justify-end gap-sm p-sm md:p-md border-t border-outline-variant bg-surface-container-lowest ${className}`}
    >
      {children}
    </div>
  );
};

export default ModalFooter;