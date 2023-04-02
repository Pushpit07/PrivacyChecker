const checkForKey = () => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["openai-key"], (result) => {
			resolve(result["openai-key"]);
		});
	});
};
checkForKey().then((response) => {
	if (response) {
		document.getElementById("key_needed").style.display = "none";
		document.getElementById("key_entered").style.display = "block";
	}
});

const encode = (input) => {
	return btoa(input);
};

const saveKey = () => {
	const input = document.getElementById("key_input");

	if (input) {
		const { value } = input;

		// Encode String
		const encodedValue = encode(value);

		// Save to google storage
		chrome.storage.local.set({ "openai-key": encodedValue }, () => {
			document.getElementById("key_needed").style.display = "none";
			document.getElementById("key_entered").style.display = "block";
		});
	}
};

const changeKey = () => {
	document.getElementById("key_needed").style.display = "block";
	document.getElementById("key_entered").style.display = "none";
};

document.getElementById("save_key_button").addEventListener("click", saveKey);
document.getElementById("change_key_button").addEventListener("click", changeKey);

// Summarize Privacy Policy
function isPrivacyPolicyPage(url) {
	// Convert the URL to lowercase
	url = url.toLowerCase();

	// Check if the URL contains any of the following terms or phrases:
	// "privacy", "privacy policy", "data protection", "data privacy", "information security",
	// "data collection", "cookie policy", "data processing", "gdpr", "caloppa"
	return (
		url.includes("privacy") ||
		url.includes("privacy policy") ||
		url.includes("data protection") ||
		url.includes("data privacy") ||
		url.includes("information security") ||
		url.includes("data collection") ||
		url.includes("cookie policy") ||
		url.includes("data processing") ||
		url.includes("gdpr") ||
		url.includes("caloppa")
	);
}

// Function to get + decode API key
const getKey = () => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["openai-key"], (result) => {
			if (result["openai-key"]) {
				const decodedKey = atob(result["openai-key"]);
				resolve(decodedKey);
			}
		});
	});
};

const summarizePrivacyPolicy = async () => {
	chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
		document.getElementById("summarize_privacy_button").innerHTML = "Summarizing...";
		document.getElementById("summarize_privacy_button").disabled = true;
		let url = tabs[0].url;

		if (isPrivacyPolicyPage(url)) {
			await generateCompletionAction(url);
		} else {
			alert("This is not a privacy policy page");
		}
		document.getElementById("summarize_privacy_button").innerHTML = "Summarize Privacy Policy";
		document.getElementById("summarize_privacy_button").disabled = false;
	});
};

document.getElementById("summarize_privacy_button").addEventListener("click", summarizePrivacyPolicy);

const generate = async (prompt) => {
	// Get your API key from storage
	const key = await getKey();
	const url = "https://api.openai.com/v1/completions";

	// Call completions endpoint
	try {
		const completionResponse = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key}`,
			},
			body: JSON.stringify({
				model: "text-davinci-003",
				prompt: prompt,
				max_tokens: 3000,
				temperature: 0.7,
			}),
		});

		// Select the top choice and send back
		const completion = await completionResponse.json();
		if (completion.error) {
			alert("OpenAI Quota Exceeded\n\n" + completion.error.message);
			return;
		}
		return completion.choices.pop();
	} catch (error) {
		console.log(error);
		alert(error.message);
		return;
	}
};

const generateCompletionAction = async (url) => {
	try {
		const basePromptPrefix = `
		Point out the suspicious, red flags, and warning signs that I should look out for to protect my personal data and privacy from the following website's Privacy Policy page. Write the exact sentences too.

      	Website:
      	`;

		// Add this to call GPT-3
		const baseCompletion = await generate(`${basePromptPrefix} ${url}\n`);

		// Let's see what we get!
		if (baseCompletion) {
			const summary_result = baseCompletion.text;
			displayPrivacySummary(url, summary_result);
		}
	} catch (error) {
		console.log(error);
	}
};

const displayPrivacySummary = (url, summary_result) => {
	let domain = new URL(url);
	domain = domain.hostname;

	document.getElementById("domain").innerHTML = domain;
	document.getElementById("domain").style.display = "block";
	document.getElementById("privacy_summary").innerHTML = "Suspicious red flags and warning signs:\n" + summary_result;
	document.getElementById("privacy_summary").style.display = "block";
};
