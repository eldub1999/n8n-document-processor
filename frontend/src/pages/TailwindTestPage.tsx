import React from 'react';

const TailwindTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Tailwind CSS Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Card Component</h2>
          <p className="text-gray-600 mb-4">
            This card is styled using Tailwind CSS utility classes. Tailwind provides a utility-first approach 
            to styling, allowing for rapid development and consistent design.
          </p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">
            Click Me
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Item {item}</h3>
              <p className="text-gray-600">This is a responsive grid item using Tailwind's grid utilities.</p>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white rounded-lg shadow-md p-6">
          <div className="text-gray-800">
            <h3 className="text-lg font-medium mb-1">Flexbox Layout</h3>
            <p className="text-gray-600">Using Tailwind's flex utilities for responsive layouts.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindTestPage; 