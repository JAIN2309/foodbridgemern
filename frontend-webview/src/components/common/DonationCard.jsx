import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Users } from 'lucide-react';

const DonationCard = ({ donation, showDonor = false, showNGO = false, onAction }) => {
  const { t } = useTranslation();
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48">
        <img
          src={donation.photo_url}
          alt={t('donationCard.foodDonation')}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(donation.status)}`}>
            {donation.status.toUpperCase()}
          </span>
        </div>
        {donation.quality_score && (
          <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-full text-xs font-semibold">
            ⭐ {donation.quality_score.toFixed(1)}/10
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Food Items */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            {donation.food_items?.map(item => item.name).join(', ') || t('donationCard.foodItems')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {donation.food_items?.[0]?.description || t('donationCard.noDescription')}
          </p>
        </div>

        {/* Donor Info */}
        {showDonor && donation.donor_id && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{t('donationCard.by')}: {donation.donor_id.organization_name}</span>
          </div>
        )}

        {/* NGO Info */}
        {showNGO && donation.claimed_by && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{t('donationCard.claimedBy')}: {donation.claimed_by.organization_name}</span>
          </div>
        )}

        {/* Serves */}
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span>{t('donationCard.serves')} {donation.quantity_serves} {t('donationCard.people')}</span>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="truncate">{donation.pickup_address}</span>
        </div>

        {/* Pickup Window */}
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span>
            {formatDate(donation.pickup_window_start)} - {formatDate(donation.pickup_window_end)}
          </span>
        </div>

        {/* Expiry Info */}
        {donation.food_items?.[0]?.expiry_date && (
          <div className="text-xs text-gray-500">
            {t('donationCard.expires')}: {formatDate(donation.food_items[0].expiry_date)}
          </div>
        )}

        {/* Action Button */}
        {onAction && (
          <button
            onClick={() => onAction(donation)}
            className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('donationCard.viewDetails')}
          </button>
        )}

        {/* Timestamps */}
        <div className="pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
          <div>{t('donationCard.posted')}: {formatDate(donation.createdAt)}</div>
          {donation.claimed_at && (
            <div>{t('donationCard.claimed')}: {formatDate(donation.claimed_at)}</div>
          )}
          {donation.collected_at && (
            <div>{t('donationCard.collected')}: {formatDate(donation.collected_at)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationCard;
