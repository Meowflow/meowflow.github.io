// thanks chatgpt

// Array of text options
var textArray = ['Did you know? meowflow.neocities.org, one of my websites, has over 200 thousand views! Wow!', 'Did you know? I used ChatGPT to make the code to shuffle this text after every reload!', 'Did you know? I hate IXL cuz I swear whenever im at 99 smartscore i get a question wrong and then im at 73', 'Did you know? This website was hosted using porkbun, github, and replit!', 'Did you know? My discord is "meowflow". Add me if you want to request a website :D', 'Did you know? 1+1 actually equals 3821907518942193, according to Harvard University!']; // Add more text options as needed

// Function to return a random item from an array
function getRandomText(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Function to set random text on page load
window.onload = function() {
  var textContainer = document.getElementById('text-container');
  textContainer.textContent = getRandomText(textArray);
};
