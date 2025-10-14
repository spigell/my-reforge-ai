#!/usr/bin/env ts-node
// To run this script, you may need to install ts-node:
// npm install -g ts-node
// Then, you can run the script directly:
// ./src/fetch-usage.ts
// Or using:
// ts-node src/fetch-usage.ts

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Define types for the data structures we expect.
interface AuthTokens {
    access_token: string;
    account_id: string;
}

interface AuthFile {
    tokens: AuthTokens;
}

interface RateLimitWindow {
    used_percent: number;
    limit_window_seconds: number;
    reset_after_seconds: number;
}

interface UsageData {
    plan_type: string;
    rate_limit: {
        allowed: boolean;
        limit_reached: boolean;
        primary_window: RateLimitWindow;
        secondary_window: RateLimitWindow;
    };
}

/**
 * Fetches API usage data, calculates, and displays the remaining token budget for the current day.
 */
async function getTodaysRemainingUsage() {
    // Construct the path to the auth file, located in the user's home directory.
    const homeDir = os.homedir();
    const authFilePath = path.join(homeDir, '.codex', 'auth.json');

    let authData: AuthFile;
    try {
        const fileContent = await fs.readFile(authFilePath, 'utf-8');
        authData = JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error: Could not read or parse the auth file at: ${authFilePath}`);
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.error("The file does not exist.");
        } else if (error instanceof Error) {
            console.error("Error details:", error.message);
        }
        process.exit(1);
    }

    // Extract the token and account ID from the auth file.
    const token = authData.tokens?.access_token;
    const accountId = authData.tokens?.account_id;

    if (!token || !accountId) {
        console.error(`Error: Could not find '.tokens.access_token' or '.tokens.account_id' in ${authFilePath}`);
        process.exit(1);
    }

    // Fetch the usage data from the API endpoint.
    let usageData: UsageData;
    try {
        const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'chatgpt-account-id': accountId,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        usageData = await response.json() as UsageData;
    } catch (error) {
        console.error('Error: Failed to fetch usage data from the API.');
        if (error instanceof Error) {
            console.error(error.message);
        }
        process.exit(1);
    }

    // Calculate the remaining daily budget from the weekly usage window.
    const weeklyUsage = usageData.rate_limit.secondary_window;
    const totalWeeklyWindowSeconds = weeklyUsage.limit_window_seconds;
    const secondsUntilReset = weeklyUsage.reset_after_seconds;
    
    // The API provides a weekly window. We assume it's exactly 7 days.
    const totalDaysInWindow = 7;

    const secondsPassed = totalWeeklyWindowSeconds - secondsUntilReset;
    const daysPassed = secondsPassed / (60 * 60 * 24);

    // The API provides usage as a percentage, so the total allowance is 100.
    const totalWeeklyAllowance = 100; 
    
    // Calculate the "earned" portion of the allowance based on how much of the week has passed.
    const earnedAllowance = (daysPassed / totalDaysInWindow) * totalWeeklyAllowance;
    
    const consumedAllowance = weeklyUsage.used_percent;

    const remainingForToday = earnedAllowance - consumedAllowance;

    // Display the results to the user.
    console.log(`Plan: ${usageData.plan_type}`);
    console.log(`Total weekly usage so far: ${consumedAllowance.toFixed(2)}%`);
    
    if (remainingForToday >= 0) {
        console.log(`
You have ${remainingForToday.toFixed(2)}% of your token budget left for today.`);
    } else {
        console.log(`
You have exceeded today's token budget by ${Math.abs(remainingForToday).toFixed(2)}%.`);
    }
    
    const dailyBudget = totalWeeklyAllowance / totalDaysInWindow;
    console.log(`(Your average daily budget is ~${dailyBudget.toFixed(2)}% of the weekly total)`);
}

// Run the script and handle any top-level errors.
getTodaysRemainingUsage().catch(error => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
});
