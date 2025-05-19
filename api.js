const axios = require("axios");

/**
 * Fetches download details for a given Terabox link.
 * @param {string} id - The Terabox file link or ID.
 * @returns {object|null} Download info or null on failure.
 */
async function getDetails(id) {
    try {
        const response = await axios.get(`https://terabox-dl-arman.vercel.app/api?data=${encodeURIComponent(id)}`);
        
        if (response.data && response.data.success) {
            return response.data;
        } else {
            console.error("Failed to fetch download details:", response.data);
            return null;
        }
    } catch (error) {
        console.error("Error in getDetails():", error.message);
        return null;
    }
}

module.exports = {
    getDetails,
};
