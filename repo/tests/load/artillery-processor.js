/**
 * Artillery Processor Functions
 * 
 * Custom functions for generating dynamic test data
 * and processing responses during load testing
 */

module.exports = {
  // Generate random user ID
  generateUserId() {
    return Math.floor(Math.random() * 1000000);
  },
  
  // Generate random session ID
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  },
  
  // Generate random timestamp
  generateTimestamp() {
    return Date.now();
  },
  
  // Random think time between min and max seconds
  randomThinkTime(min = 1, max = 3) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Generate random category ID (1-5)
  generateCategoryId() {
    return Math.floor(Math.random() * 5) + 1;
  },
  
  // Generate random product ID (1-100)
  generateProductId() {
    return Math.floor(Math.random() * 100) + 1;
  },
  
  // Process response data (if needed)
  processResponse(requestParams, response, context, ee, userContext) {
    // Log response time for debugging
    if (response && response.timings) {
      console.log(`Response time: ${response.timings.response}ms`);
    }
  },
  
  // Generate custom headers
  generateHeaders() {
    return {
      'X-Test-User': this.generateUserId(),
      'X-Test-Session': this.generateSessionId(),
      'X-Test-Timestamp': this.generateTimestamp()
    };
  }
};
