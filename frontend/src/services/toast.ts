type ToastOptions = {
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
};

// Simple notification service that can be replaced with a proper toast library later
export const toaster = {
  create: (options: ToastOptions) => {
    console.log(`Toast: ${options.type || 'info'} - ${options.title}${options.description ? ` - ${options.description}` : ''}`);
    
    // In a real implementation, you would show a visual toast here
    // For now, we're just logging to console as placeholder
    // You could add a real toast library if needed
  }
}; 