import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import { post as apiPost } from './apiClient';

const normalizeListingStatus = (status) => {
  if (status === true || status === 'true') return 'published';
  if (status === false || status === 'false') return 'draft';
  if (status == null) return 'published';
  
  const normalized = String(status).trim().toLowerCase();
  if (normalized === '') return 'published';
  
  if (['published', 'active', 'approved', 'public', 'visible', 'available', 'open'].includes(normalized)) {
    return 'published';
  }
  if (['draft', 'pending', 'rejected'].includes(normalized)) {
    return 'draft';
  }
  return normalized;
};

// ============ PROPERTY FUNCTIONS ============

export async function createListing(listingData) {
  try {
    console.log('Creating property in Firestore with data:', {
      ...listingData,
      image: listingData.image ? listingData.image.substring(0, 50) + '...' : 'none'
    });
    
    // Ensure required fields are present
    if (!listingData.hostId) {
      throw new Error('hostId is required');
    }
    if (!listingData.title) {
      throw new Error('title is required');
    }
    const propertyRef = await addDoc(collection(db, 'properties'), {
      title: listingData.title,
      description: listingData.description || '',
      location: listingData.location || {},
      price: listingData.price || 0,
      discount: listingData.discount || 0,
      rate: listingData.rate || listingData.price || 0,
      promoName: listingData.promoName || '',
      promoDetails: listingData.promoDetails || '',
      amenities: listingData.amenities || [],
      blockedDates: listingData.blockedDates || [],
      availability: listingData.availability || [],
      hostId: listingData.hostId,
      ownerId: listingData.ownerId || listingData.hostId,
      hostName: listingData.hostName || '',
      image: listingData.image || '', // Base64 image string
      imageURLs: listingData.imageURLs || [], // Array of base64 strings (for compatibility)
      photos: listingData.photos || listingData.imageURLs || [],
      category: listingData.category || 'Home',
      status: normalizeListingStatus(listingData.status || 'draft'), // 'draft' or 'published'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Property created successfully with ID:', propertyRef.id);
    return propertyRef.id;
  } catch (error) {
    console.error('Firestore Error - Failed to create property:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw new Error(`Failed to save property to Firestore: ${error.message}`);
  }
}

export async function updateListing(listingId, updates) {
  try {
    console.log('Updating property:', listingId, updates);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      payload.status = normalizeListingStatus(updates.status);
    }

    await updateDoc(doc(db, 'properties', listingId), payload);
    console.log('Property updated successfully');
  } catch (error) {
    console.error('Firestore Error - Failed to update property:', error);
    throw new Error(`Failed to update property: ${error.message}`);
  }
}

export async function deleteListing(listingId) {
  try {
    console.log('Deleting property:', listingId);
    await deleteDoc(doc(db, 'properties', listingId));
    console.log('Property deleted successfully');
  } catch (error) {
    console.error('Firestore Error - Failed to delete property:', error);
    throw new Error(`Failed to delete property: ${error.message}`);
  }
}

async function fetchListingFromCollection(listingId, collectionName = 'properties') {
  console.log(`[getListing] Fallback: scanning ${collectionName} for listing:`, listingId);
  const snapshot = await getDocs(collection(db, collectionName));
  const match = snapshot.docs.find(docSnap => docSnap.id === listingId);
  if (!match) {
    console.warn(`[getListing] Fallback: listing not found in ${collectionName}:`, listingId);
    return null;
  }
  const data = match.data();
  const normalizedStatus = normalizeListingStatus(data.status);
  return { ...data, id: match.id, status: normalizedStatus };
}

export async function getListing(listingId, options = {}) {
  try {
    console.log('[getListing] Fetching listing with ID:', listingId);
    console.log('[getListing] Collection: properties -> listings fallback');
    
    let docSnap = await getDoc(doc(db, 'properties', listingId));
    if (!docSnap.exists()) {
      console.warn('[getListing] Not found in properties; checking listings collection');
      docSnap = await getDoc(doc(db, 'listings', listingId));
    }
    
    console.log('[getListing] Document exists:', docSnap.exists());
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const normalizedStatus = normalizeListingStatus(data.status);
      console.log('[getListing] Listing data:', {
        id: docSnap.id,
        title: data.title,
        status: normalizedStatus,
        hostId: data.hostId,
        price: data.price
      });
      const { id: _legacyId, ...rest } = data;
      return { ...rest, id: docSnap.id, status: normalizedStatus };
    }
    
    if (!options.skipCollectionFallback) {
      const fromProperties = await fetchListingFromCollection(listingId, 'properties');
      if (fromProperties) return fromProperties;
      return await fetchListingFromCollection(listingId, 'listings');
    }
    
    return null;
  } catch (error) {
    console.error('[getListing] Firestore Error - Failed to get property:', error);
    console.error('[getListing] Error code:', error.code);
    console.error('[getListing] Error message:', error.message);
    
    if (!options.skipCollectionFallback && (error.code === 'permission-denied' || error.code === 'failed-precondition')) {
      console.warn('[getListing] Retrying with fallback due to error:', error.code);
      return await fetchListingFromCollection(listingId);
    }
    
    throw new Error(`Failed to get property: ${error.message}`);
  }
}

export const isListingPublic = (listing) => {
  if (!listing) return false;
  const normalized = normalizeListingStatus(listing.status);
  if (normalized === 'published') return true;
  if (listing.isPublished === true) return true;
  if ((listing.visibility || '').toLowerCase() === 'public') return true;
  if (listing.status === true) return true;
  return false;
};

export async function getListings(filters = {}) {
  try {
    console.log('[getListings] Starting fetch with filters:', filters);
    console.log('[getListings] Collection path: properties');
    
    let q = query(collection(db, 'properties'));
    
    if (filters.hostId) {
      console.log('[getListings] Filtering by hostId:', filters.hostId);
      q = query(q, where('hostId', '==', filters.hostId));
    }
    if (filters.ownerId) {
      console.log('[getListings] Filtering by ownerId:', filters.ownerId);
      q = query(q, where('ownerId', '==', filters.ownerId));
    }
    if (filters.ownerId) {
      console.log('[getListings] Filtering by ownerId:', filters.ownerId);
      q = query(q, where('ownerId', '==', filters.ownerId));
    }
    if (filters.category) {
      console.log('[getListings] Filtering by category:', filters.category);
      q = query(q, where('category', '==', filters.category));
    }
    const shouldQueryStatus = filters.status && filters.status !== 'published';
    const shouldQueryPublished = filters.status === 'published' && !filters.__skipStatusQuery;
    
    if (shouldQueryStatus) {
      console.log('[getListings] Filtering by status:', filters.status);
        q = query(q, where('status', '==', filters.status));
    } else if (shouldQueryPublished) {
      console.log('[getListings] Filtering by published-like statuses');
      q = query(q, where('status', 'in', ['published', 'active', 'approved', 'public', 'visible', 'available', 'open']));
    }
    if (filters.location) {
      console.log('[getListings] Filtering by location:', filters.location);
      q = query(q, where('location.city', '==', filters.location));
    }
    
    console.log('[getListings] Executing Firestore query...');
    const querySnapshot = await getDocs(q);
    console.log('[getListings] Query snapshot size:', querySnapshot.size);
    
    let listings = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const normalizedStatus = normalizeListingStatus(data.status);
      console.log('[getListings] Listing:', doc.id, {
        title: data.title,
        hostId: data.hostId,
        status: normalizedStatus,
        hasImage: !!data.image,
        hasImageURLs: !!data.imageURLs,
        imageURLsCount: data.imageURLs?.length || 0,
        createdAt: data.createdAt
      });
      const { id: _legacyId, ...rest } = data;
      return {
        ...rest,
        id: doc.id,
        status: normalizedStatus
      };
    });
    
    if (filters.status === 'published' || filters.__filterPublished) {
      listings = listings.filter(isListingPublic);
    } else if (filters.status && !shouldQueryStatus) {
      listings = listings.filter(listing => normalizeListingStatus(listing.status) === normalizeListingStatus(filters.status));
    }
    
    listings = listings.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return bTime - aTime; // Descending order (newest first)
    });
    console.log('[getListings] Sorted listings by createdAt in JavaScript');
    
    console.log('[getListings] Returning', listings.length, 'listings');
    return listings;
  } catch (error) {
    console.error('[getListings] Firestore Error - Failed to get properties:', error);
    console.error('[getListings] Error code:', error.code);
    console.error('[getListings] Error message:', error.message);
    console.error('[getListings] Error stack:', error.stack);
    
    // Provide helpful error message for index errors
    if (filters.status === 'published' && !filters.__skipStatusQuery) {
      console.warn('[getListings] Error retrieving published listings, retrying without server-side filter:', error.code, error.message);
      return await getListings({
        ...filters,
        __skipStatusQuery: true,
        __filterPublished: true
      });
    }
    
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      throw new Error(`Firestore index required. Please check the console for the index creation link, or the query will be fixed automatically.`);
    }
    
    throw new Error(`Failed to get properties: ${error.message}`);
  }
}

export async function approveListing(listingId) {
  try {
    await updateDoc(doc(db, 'properties', listingId), {
      status: 'published',
      approvedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to approve property:', error);
    throw new Error(`Failed to approve property: ${error.message}`);
  }
}

export async function rejectListing(listingId) {
  try {
    await updateDoc(doc(db, 'properties', listingId), {
      status: 'draft',
      rejectedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to reject property:', error);
    throw new Error(`Failed to reject property: ${error.message}`);
  }
}

// ============ BOOKING FUNCTIONS ============

export async function createBooking(bookingData) {
  const {
    status = 'pending',
    ...rest
  } = bookingData;

  const bookingRef = await addDoc(collection(db, 'bookings'), {
    ...rest,
    checkIn: Timestamp.fromDate(new Date(bookingData.checkIn)),
    checkOut: Timestamp.fromDate(new Date(bookingData.checkOut)),
    status,
    createdAt: serverTimestamp()
  });
  return bookingRef.id;
}

export async function updateBooking(bookingId, updates) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function getBookings(filters = {}) {
  const baseRef = collection(db, 'bookings');

  const applyFiltersInMemory = (items) => {
    let list = items;
    if (filters.guestId) list = list.filter(item => item.guestId === filters.guestId);
    if (filters.hostId) list = list.filter(item => item.hostId === filters.hostId);
    if (filters.listingId) list = list.filter(item => item.listingId === filters.listingId);
    if (filters.status) list = list.filter(item => item.status === filters.status);
    return list.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return bTime - aTime;
    });
  };

  const constraints = [];
  if (filters.guestId) constraints.push(where('guestId', '==', filters.guestId));
  if (filters.hostId) constraints.push(where('hostId', '==', filters.hostId));
  if (filters.listingId) constraints.push(where('listingId', '==', filters.listingId));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('createdAt', 'desc'));
  
  try {
    const q = query(baseRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    const needsIndex = error?.code === 'failed-precondition' || error?.message?.includes('index');
    if (!needsIndex) {
      throw error;
    }
    console.warn('[getBookings] Missing Firestore index, falling back to client-side filtering. Error:', error.message);
    const snapshot = await getDocs(baseRef);
    const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
    return applyFiltersInMemory(items);
  }
}

export async function checkAvailability(listingId, checkIn, checkOut) {
  const bookings = await getBookings({ listingId });
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  const isBlockingStatus = (status) => {
    const normalized = (status || '').toLowerCase();
    return !['declined', 'cancelled', 'canceled', 'refunded'].includes(normalized);
  };

  return !bookings.some((booking) => {
    if (!isBlockingStatus(booking.status)) {
      return false;
    }
    const bookingCheckIn = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
    const bookingCheckOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
    
    return (
      (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
      (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
      (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
    );
  });
}

export async function acceptBooking(bookingId) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'accepted',
    acceptedAt: serverTimestamp()
  });
}

export async function declineBooking(bookingId) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'declined',
    declinedAt: serverTimestamp()
  });
}

// ============ REVIEW FUNCTIONS ============

export async function createReview(reviewData) {
  const reviewRef = await addDoc(collection(db, 'reviews'), {
    ...reviewData,
    createdAt: serverTimestamp()
  });
  return reviewRef.id;
}

export async function updateReview(reviewId, updates) {
  await updateDoc(doc(db, 'reviews', reviewId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function getReviews(listingId) {
  const q = query(
    collection(db, 'reviews'),
    where('listingId', '==', listingId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ============ USER FUNCTIONS ============

export async function getUser(uid) {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getAllUsers() {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

export async function updateUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to update profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

export async function uploadProfileImage(uid, file) {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${uid}_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `profiles/${fileName}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Storage Error - Failed to upload image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

export async function sendHostMessage(messageData) {
  try {
    await addDoc(collection(db, 'hostMessages'), {
      ...messageData,
      // Ensure sender/receiver fields are always set for security rules
      senderId: messageData.guestId,
      receiverId: messageData.hostId,
      status: 'unread',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to send host message:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

export async function getHostMessages(hostId) {
  try {
    const messagesRef = collection(db, 'hostMessages');
   
    // Firestore doesn't support OR queries in a single call, so we fetch
    // messages where the host is either the sender or the receiver, then merge.
    const [senderSnap, receiverSnap] = await Promise.all([
      getDocs(query(messagesRef, where('senderId', '==', hostId))),
      getDocs(query(messagesRef, where('receiverId', '==', hostId)))
    ]);

    const allDocsMap = new Map();
    senderSnap.forEach(docSnap => allDocsMap.set(docSnap.id, docSnap));
    receiverSnap.forEach(docSnap => allDocsMap.set(docSnap.id, docSnap));

    const messages = [];
    
    for (const docSnap of allDocsMap.values()) {
      const data = docSnap.data();
      
      // Get guest name from users collection if available
      let guestName = data.guestEmail || 'Guest';
      try {
        if (data.guestId) {
          const userDoc = await getDoc(doc(db, 'users', data.guestId));
  if (userDoc.exists()) {
    const userData = userDoc.data();
            guestName = userData.displayName || userData.email || guestName;
          }
        }
      } catch (error) {
        console.warn('Could not fetch guest name:', error);
      }
      
      // Format timestamp
      let timestamp = 'Just now';
      if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
          timestamp = 'Just now';
        } else if (diffMins < 60) {
          timestamp = `${diffMins}m ago`;
        } else if (diffHours < 24) {
          timestamp = `${diffHours}h ago`;
        } else if (diffDays < 7) {
          timestamp = `${diffDays}d ago`;
        } else {
          timestamp = date.toLocaleDateString();
        }
      }
      
      const isSentByHost = data.senderId === hostId;
      const isReceivedByHost = data.receiverId === hostId;

      messages.push({
        id: docSnap.id,
        guestId: data.guestId,
        guestEmail: data.guestEmail,
        guestName: guestName,
        senderId: data.senderId,
        receiverId: data.receiverId,
        listingId: data.listingId,
        listingTitle: data.listingTitle,
        topic: data.topic,
        message: data.message,
        lastMessage: data.message,
        status: data.status || 'unread',
        unread: data.status === 'unread',
        createdAt: data.createdAt,
        timestamp: timestamp,
        createdAtValue: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()) : 0,
        isSentByHost,
        isReceivedByHost
      });
    }
    
    // Sort by createdAt descending (newest first)
    messages.sort((a, b) => b.createdAtValue - a.createdAtValue);
    
    return messages;
  } catch (error) {
    console.error('Firestore Error - Failed to get host messages:', error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }
}

export async function replyToMessage(originalMessageId, replyData) {
  try {
    // Create a reply message in the same collection
    await addDoc(collection(db, 'hostMessages'), {
      ...replyData,
      originalMessageId: originalMessageId,
      status: 'unread',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to send reply:', error);
    throw new Error(`Failed to send reply: ${error.message}`);
  }
}

export async function sendGuestReply(originalMessageId, replyData) {
  try {
    // Create a reply message in the same collection (hostMessages)
    await addDoc(collection(db, 'hostMessages'), {
      ...replyData,
      originalMessageId: originalMessageId,
      status: 'unread',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firestore Error - Failed to send guest reply:', error);
    throw new Error(`Failed to send reply: ${error.message}`);
  }
}

export async function deleteMessage(messageId) {
  try {
    await deleteDoc(doc(db, 'hostMessages', messageId));
  } catch (error) {
    console.error('Firestore Error - Failed to delete message:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

export async function getGuestMessages(guestId) {
  try {
    const messagesRef = collection(db, 'hostMessages');
   
    // Firestore doesn't support OR queries in a single call, so we fetch
    // messages where the guest is either the sender or the receiver, then merge.
    const [senderSnap, receiverSnap] = await Promise.all([
      getDocs(query(messagesRef, where('senderId', '==', guestId))),
      getDocs(query(messagesRef, where('receiverId', '==', guestId)))
    ]);
    
    const allDocsMap = new Map();
    senderSnap.forEach(docSnap => allDocsMap.set(docSnap.id, docSnap));
    receiverSnap.forEach(docSnap => allDocsMap.set(docSnap.id, docSnap));

    const messages = [];
    
    for (const docSnap of allDocsMap.values()) {
      const data = docSnap.data();
            
      // Determine if this is a message sent by guest or received by guest.
      // We ONLY treat messages as sent by the guest when senderId === guestId.
      // (Older messages may still have guestId set even when the host is the sender,
      //  so we must not rely on guestId for this check.)
      const isSentByGuest = data.senderId === guestId;
      const isReceivedByGuest = data.receiverId === guestId;
      
      // Get host/other party name
      let otherPartyName = 'Host';
      let otherPartyId = null;
      
      if (isSentByGuest) {
        // Guest sent this, so get host info
        otherPartyId = data.hostId || data.receiverId;
      } else {
        // Guest received this, so get sender info
        otherPartyId = data.senderId || data.hostId;
      }
      
      try {
        if (otherPartyId) {
          const userDoc = await getDoc(doc(db, 'users', otherPartyId));
  if (userDoc.exists()) {
    const userData = userDoc.data();
            otherPartyName = userData.displayName || userData.email || 'Host';
          }
        }
      } catch (error) {
        console.warn('Could not fetch other party name:', error);
      }
      
      // Format timestamp
      let timestamp = 'Just now';
      if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
          timestamp = 'Just now';
        } else if (diffMins < 60) {
          timestamp = `${diffMins}m ago`;
        } else if (diffHours < 24) {
          timestamp = `${diffHours}h ago`;
        } else if (diffDays < 7) {
          timestamp = `${diffDays}d ago`;
        } else {
          timestamp = date.toLocaleDateString();
        }
      }
      
      messages.push({
        id: docSnap.id,
        hostId: data.hostId || data.senderId,
        hostName: otherPartyName,
        guestId: data.guestId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        listingId: data.listingId,
        listingTitle: data.listingTitle,
        topic: data.topic,
        message: data.message,
        status: data.status || 'unread',
        unread: data.status === 'unread' && isReceivedByGuest,
        createdAt: data.createdAt,
        timestamp: timestamp,
        createdAtValue: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()) : 0,
        isReply: !!data.originalMessageId,
        originalMessageId: data.originalMessageId,
        isSentByGuest: isSentByGuest,
        isReceivedByGuest: isReceivedByGuest
      });
    }
    
    // Sort by createdAt descending (newest first)
    messages.sort((a, b) => b.createdAtValue - a.createdAtValue);
    
    return messages;
  } catch (error) {
    console.error('Firestore Error - Failed to get guest messages:', error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }
}

// ============ PAYMENTS ============

export async function processBookingPayment(payload, idToken) {
  console.log('[Payments] processBookingPayment invoked', {
    payload,
    hasToken: Boolean(idToken)
  });
  try {
    const response = await apiPost('/api/payments/capture-and-payout', payload, { token: idToken });
    console.log('[Payments] processBookingPayment success', {
      ...response,
      captureId: response?.captureId
    });
    return response;
  } catch (error) {
    console.error('[Payments] processBookingPayment failed', error);
    throw error;
  }
}

// ============ WISHLIST FUNCTIONS ============

const WISHLIST_COLLECTION = 'wishlists';
const buildWishlistDocId = (userId, listingId) => `${userId}_${listingId}`;

export async function addToWishlist(userId, listingId) {
  const entryId = buildWishlistDocId(userId, listingId);
  const entryRef = doc(db, WISHLIST_COLLECTION, entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    await setDoc(entryRef, {
      guestId: userId,
      listingId,
      createdAt: serverTimestamp()
    });
  }
}

export async function removeFromWishlist(userId, listingId) {
  const entryId = buildWishlistDocId(userId, listingId);
  await deleteDoc(doc(db, WISHLIST_COLLECTION, entryId));
}

export async function getWishlist(userId) {
  const q = query(
    collection(db, WISHLIST_COLLECTION),
    where('guestId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data().listingId);
}

// ============ FAVORITES FUNCTIONS ============

const FAVORITES_COLLECTION = 'favorites';
const buildFavoriteDocId = (userId, listingId) => `${userId}_${listingId}`;

export async function addFavorite(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('User ID and Listing ID are required to add a favorite');
  }
  
  // Verify auth state matches userId
  if (auth.currentUser?.uid !== userId) {
    console.warn('[Favorites] Auth user mismatch:', {
      authUid: auth.currentUser?.uid,
      providedUserId: userId
    });
  }
  
  try {
    const entryId = buildFavoriteDocId(userId, listingId);
    const entryRef = doc(db, FAVORITES_COLLECTION, entryId);
    
    // Check if already exists first (read is usually more permissive)
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
      console.log('[Favorites] Favorite already exists:', { userId, listingId, entryId });
      return; // Already favorited, no need to create again
    }
    
    // Prepare data exactly as rules expect
    const favoriteData = {
      guestId: userId, // Must match request.auth.uid
      listingId: String(listingId),
      createdAt: serverTimestamp()
    };
    
    console.log('[Favorites] Creating favorite with data:', {
      ...favoriteData,
      createdAt: '[serverTimestamp]'
    });
    console.log('[Favorites] Auth check:', {
      authExists: !!auth.currentUser,
      authUid: auth.currentUser?.uid,
      matchesUserId: auth.currentUser?.uid === userId
    });
    
    await setDoc(entryRef, favoriteData);
    console.log('[Favorites] ✅ Successfully added favorite:', { userId, listingId, entryId });
  } catch (error) {
    console.error('[Favorites] ❌ Error adding favorite:', error);
    console.error('[Favorites] Error details:', {
      code: error.code,
      message: error.message,
      userId,
      listingId,
      authUser: auth.currentUser?.uid,
      authState: auth.currentUser ? 'authenticated' : 'not authenticated',
      authEmail: auth.currentUser?.email,
      entryId: buildFavoriteDocId(userId, listingId)
    });
    throw error;
  }
}

export async function removeFavorite(userId, listingId) {
  if (!userId || !listingId) {
    throw new Error('User ID and Listing ID are required to remove a favorite');
  }
  
  try {
    const entryId = buildFavoriteDocId(userId, listingId);
    const entryRef = doc(db, FAVORITES_COLLECTION, entryId);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
      await deleteDoc(entryRef);
      console.log('[Favorites] Successfully removed favorite:', { userId, listingId, entryId });
    } else {
      console.log('[Favorites] Favorite does not exist, nothing to remove:', { userId, listingId, entryId });
    }
  } catch (error) {
    console.error('[Favorites] Error removing favorite:', error);
    console.error('[Favorites] Error details:', {
      code: error.code,
      message: error.message,
      userId,
      listingId
    });
    throw error;
  }
}

export async function getFavorites(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('guestId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data().listingId);
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('[Favorites] Missing index; falling back to unsorted fetch.');
      const snapshot = await getDocs(collection(db, FAVORITES_COLLECTION));
      return snapshot.docs
        .map((docSnap) => docSnap.data())
        .filter((data) => data.guestId === userId)
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        })
        .map((data) => data.listingId);
    }
    throw error;
  }
}

// ============ COUPON / LOYALTY FUNCTIONS ============

const COUPON_COLLECTION = 'coupons';
const COUPON_EXPIRY_DAYS = 30;
const COUPON_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponCode(length = 10) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += COUPON_CHARSET.charAt(Math.floor(Math.random() * COUPON_CHARSET.length));
  }
  return code;
}

export async function createCouponForGuest(guestId, options = {}) {
  const discountPercent = options.discountPercent ?? 10;
  const expiresInDays = options.expiresInDays ?? COUPON_EXPIRY_DAYS;
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  );

  let code;
  let docRef;
  let attempts = 0;
  do {
    code = generateCouponCode();
    docRef = doc(db, COUPON_COLLECTION, code);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      break;
    }
    attempts += 1;
  } while (attempts < 5);

  await setDoc(docRef, {
    guestId,
    code,
    discountPercent,
    isUsed: false,
    createdAt: serverTimestamp(),
    expiresAt
  });

  return { code, discountPercent };
}

export async function getGuestCoupons(guestId) {
  if (!guestId) return [];
  const q = query(collection(db, COUPON_COLLECTION), where('guestId', '==', guestId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
}

export async function getCouponByCode(code) {
  if (!code) return null;
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;
  const couponRef = doc(db, COUPON_COLLECTION, normalizedCode);
  const couponSnap = await getDoc(couponRef);
  if (!couponSnap.exists()) return null;
  return {
    id: couponSnap.id,
    ...couponSnap.data()
  };
}

export async function markCouponUsed(code, bookingId) {
  if (!code) return;
  const normalizedCode = code.trim().toUpperCase();
  const couponRef = doc(db, COUPON_COLLECTION, normalizedCode);
  await updateDoc(couponRef, {
    isUsed: true,
    usedAt: serverTimestamp(),
    usedBookingId: bookingId || null
  });
}

// ============ ADMIN FUNCTIONS ============

export async function getDashboardStats() {
  const [listingsSnap, bookingsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'properties')),
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'users'))
  ]);

  const listings = listingsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const bookings = bookingsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const users = usersSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const statusCounts = bookings.reduce((acc, booking) => {
    const key = (booking.status || 'unknown').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const monetaryStatuses = ['paid', 'accepted', 'completed'];
  const monetaryBookings = bookings.filter((booking) =>
    monetaryStatuses.includes((booking.status || '').toLowerCase())
  );

  const totals = monetaryBookings.reduce(
    (acc, booking) => {
      const gross = Number(booking.netAmount ?? booking.totalPrice ?? 0);
      const admin = Number(
        booking.adminFee ?? Number((gross * 0.05).toFixed(2))
      );
      const host = Number(booking.hostPayout ?? Number((gross - admin).toFixed(2)));

      acc.gross += gross;
      acc.admin += admin;
      acc.host += host;
      return acc;
    },
    { gross: 0, admin: 0, host: 0 }
  );

  const monthlyMap = {};
  monetaryBookings.forEach((booking) => {
    const createdAt = booking.createdAt?.toDate
      ? booking.createdAt.toDate()
      : booking.checkIn
      ? new Date(booking.checkIn)
      : new Date();
    const year = createdAt.getFullYear();
    const month = createdAt.getMonth();
    const key = `${year}-${month}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        key,
        date: new Date(year, month, 1),
        gross: 0,
        admin: 0,
        host: 0
      };
    }
    const gross = Number(booking.netAmount ?? booking.totalPrice ?? 0);
    const admin = Number(
      booking.adminFee ?? Number((gross * 0.05).toFixed(2))
    );
    const host = Number(booking.hostPayout ?? Number((gross - admin).toFixed(2)));
    monthlyMap[key].gross += gross;
    monthlyMap[key].admin += admin;
    monthlyMap[key].host += host;
  });

  const monthlyRevenue = Object.values(monthlyMap)
    .sort((a, b) => a.date - b.date)
    .slice(-12)
    .map((item) => ({
      label: item.date.toLocaleString('default', { month: 'short' }),
      gross: Number(item.gross.toFixed(2)),
      admin: Number(item.admin.toFixed(2)),
      host: Number(item.host.toFixed(2))
    }));

  const bookingCounts = {};
  monetaryBookings.forEach((booking) => {
    bookingCounts[booking.listingId] = (bookingCounts[booking.listingId] || 0) + 1;
  });

  const topListings = Object.entries(bookingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([listingId, count]) => ({ listingId, count }));

  const publishedListings = listings.filter(
    (listing) => normalizeListingStatus(listing.status) === 'published'
  ).length;
  const draftListings = listings.filter(
    (listing) => normalizeListingStatus(listing.status) === 'draft'
  ).length;

  return {
    totalGross: Number(totals.gross.toFixed(2)),
    adminEarnings: Number(totals.admin.toFixed(2)),
    hostPayouts: Number(totals.host.toFixed(2)),
    statusCounts,
    monthlyRevenue,
    pendingListings: draftListings,
    publishedListings,
    totalBookings: bookings.length,
    totalUsers: users.length,
    topListings
  };
}

// ============ TRANSACTION / PAYOUT FUNCTIONS ============

/**
 * Get all transactions (payouts) for a host
 */
export async function getHostTransactions(hostId) {
  if (!hostId) return [];
  try {
    const q = query(
      collection(db, 'transactions'),
      where('hostId', '==', hostId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('[Transactions] Missing index; falling back to unsorted fetch.');
      const snapshot = await getDocs(collection(db, 'transactions'));
      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((tx) => tx.hostId === hostId)
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
    }
    throw error;
  }
}

/**
 * Get all transactions for admin (all hosts)
 */
export async function getAllTransactions() {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
    );
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    if (error.code === 'failed-precondition') {
      console.warn('[Transactions] Missing index; fetching all without order.');
      const snapshot = await getDocs(collection(db, 'transactions'));
      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
    }
    throw error;
  }
}
