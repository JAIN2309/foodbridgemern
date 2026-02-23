import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Clock, Thermometer } from 'lucide-react';

const FoodSafetyChecklist = ({ onSafetyUpdate, initialData = {} }) => {
  const [checklist, setChecklist] = useState({
    proper_storage: initialData.proper_storage || false,
    within_expiry: initialData.within_expiry || false,
    hygienic_preparation: initialData.hygienic_preparation || false,
    temperature_maintained: initialData.temperature_maintained || false
  });

  const [foodItems, setFoodItems] = useState(initialData.food_items || [{
    name: '',
    category: 'vegetarian',
    description: '',
    expiry_date: '',
    preparation_time: '',
    storage_conditions: 'room_temperature',
    allergens: []
  }]);

  const handleChecklistChange = (key, value) => {
    const updated = { ...checklist, [key]: value };
    setChecklist(updated);
    onSafetyUpdate({ safety_checklist: updated, food_items: foodItems });
  };

  const handleFoodItemChange = (index, field, value) => {
    const updated = [...foodItems];
    updated[index] = { ...updated[index], [field]: value };
    setFoodItems(updated);
    onSafetyUpdate({ safety_checklist: checklist, food_items: updated });
  };

  const addFoodItem = () => {
    setFoodItems([...foodItems, {
      name: '',
      category: 'vegetarian',
      description: '',
      expiry_date: '',
      preparation_time: '',
      storage_conditions: 'room_temperature',
      allergens: []
    }]);
  };

  const getQualityScore = () => {
    const checklistScore = Object.values(checklist).filter(Boolean).length * 2;
    const now = new Date();
    
    let freshnessScore = 0;
    foodItems.forEach(item => {
      if (item.expiry_date) {
        const hoursUntilExpiry = (new Date(item.expiry_date) - now) / (1000 * 60 * 60);
        freshnessScore += Math.max(0, Math.min(2, hoursUntilExpiry / 10));
      }
    });
    
    return Math.min(10, checklistScore + freshnessScore);
  };

  const qualityScore = getQualityScore();
  const scoreColor = qualityScore >= 7 ? 'text-green-600' : qualityScore >= 4 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Food Safety Verification</h3>
        <div className={`text-lg font-bold ${scoreColor}`}>
          Quality Score: {qualityScore.toFixed(1)}/10
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3">Food Items Details</h4>
        {foodItems.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Food Name *
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleFoodItemChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Vegetable Curry"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={item.category}
                  onChange={(e) => handleFoodItemChange(index, 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non-vegetarian">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={item.expiry_date}
                  onChange={(e) => handleFoodItemChange(index, 'expiry_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Conditions *
                </label>
                <select
                  value={item.storage_conditions}
                  onChange={(e) => handleFoodItemChange(index, 'storage_conditions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="refrigerated">Refrigerated (0-4°C)</option>
                  <option value="frozen">Frozen (-18°C)</option>
                  <option value="room_temperature">Room Temperature</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={addFoodItem}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Another Food Item
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Safety Checklist</h4>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.proper_storage}
              onChange={(e) => handleChecklistChange('proper_storage', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              <Thermometer className="w-5 h-5 text-blue-500" />
              <span className="text-gray-700">Food has been stored at proper temperature</span>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.within_expiry}
              onChange={(e) => handleChecklistChange('within_expiry', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">All items are within expiry date</span>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.hygienic_preparation}
              onChange={(e) => handleChecklistChange('hygienic_preparation', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">Food was prepared in hygienic conditions</span>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.temperature_maintained}
              onChange={(e) => handleChecklistChange('temperature_maintained', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center space-x-2">
              <Thermometer className="w-5 h-5 text-orange-500" />
              <span className="text-gray-700">Temperature has been maintained during transport</span>
            </div>
          </label>
        </div>
      </div>
      
      {qualityScore < 4 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Quality Score Too Low</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            Please ensure food safety requirements are met before posting donation.
          </p>
        </div>
      )}
    </div>
  );
};

export default FoodSafetyChecklist;