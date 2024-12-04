<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { Button, Input, Container, Card, Title, Text } from '@svelteuidev/core';
  import { onDestroy } from 'svelte';

  let chart;

  // Define reactive variables for total drinks and drink log
  const totalDrinkUnits = writable(0);
  const drinkLog = writable([]);
  const drinksLast7Days = writable(0);
  const drinksLast3Days = writable(0);
  const remainingDrinksToday = writable(0);
  const averageDrinksLast7Days = writable(0);

  // Load existing drinks data from localStorage when the component mounts
  onMount(() => {
    const storedTotal = localStorage.getItem('totalDrinkUnits') !== null ? parseFloat(localStorage.getItem('totalDrinkUnits')) : 0;
    totalDrinkUnits.set(storedTotal);

    const storedLog = JSON.parse(localStorage.getItem('drinkLog')) || getDummyData();
    drinkLog.set(storedLog);
    updateDrinkCounts(storedLog);
    loadChartJs(() => createChart(storedLog));
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  function getDummyData() {
    const now = new Date();
    const dummyData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      dummyData.push({
        timestamp: date.toLocaleString(),
        drinkUnits: (Math.random() * 2 + 0.5).toFixed(1),
        drinkSize: Math.floor(Math.random() * 10) + 10,
        alcoholPercentage: (Math.random() * 3 + 4).toFixed(1)
      });
    }
    return dummyData;
  }

  function addDrink(event) {
    event.preventDefault();

    // Get input values
    const drinkSize = parseFloat(event.target['drink-size'].value);
    const alcoholPercentage = parseFloat(event.target['alcohol-percentage'].value);

    // Calculate drink units based on the standard drink size (12 oz at 5%)
    const standardDrinkSize = 12;
    const standardAlcoholPercentage = 5;
    const standardDrinkAmount = standardDrinkSize * (standardAlcoholPercentage / 100);
    const currentDrinkAmount = drinkSize * (alcoholPercentage / 100);
    const drinkUnits = currentDrinkAmount / standardDrinkAmount;

    // Update total drink units
    totalDrinkUnits.update(n => {
      const updatedTotal = parseFloat(n) + drinkUnits;
      localStorage.setItem('totalDrinkUnits', updatedTotal);
      return updatedTotal;
    });

    // Add timestamped entry to drink log
    const timestamp = new Date().toLocaleString();
    const newEntry = { timestamp, drinkUnits, drinkSize, alcoholPercentage };
    drinkLog.update(log => {
      const updatedLog = [...log, newEntry];
      localStorage.setItem('drinkLog', JSON.stringify(updatedLog));
      updateDrinkCounts(updatedLog);
      if (chart) {
        chart.destroy();
      }
      createChart(updatedLog);
      return updatedLog;
    });

    // Clear form inputs
    event.target.reset();
  }

  function groupDrinksByDay(log) {
    return log.reduce((acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {});
  }

  function updateDrinkCounts(log) {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    let countLast7Days = 0;
    let countLast3Days = 0;
    let daysWithDrinks = new Set();

    log.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= sevenDaysAgo) {
        countLast7Days += parseFloat(entry.drinkUnits);
        daysWithDrinks.add(entryDate.toLocaleDateString());
      }
      if (entryDate >= threeDaysAgo) {
        countLast3Days += parseFloat(entry.drinkUnits);
      }
    });

    drinksLast7Days.set(countLast7Days);
    drinksLast3Days.set(countLast3Days);

    // Calculate remaining drinks to stay below 15 drinks in the past 7 days
    const maxDrinksIn7Days = 15;
    const remaining = maxDrinksIn7Days - countLast7Days;
    remainingDrinksToday.set(remaining > 0 ? remaining : 0);

    // Calculate 7-day running average of drinks per day
    const average = countLast7Days / 7;
    averageDrinksLast7Days.set(average);
  }

  function createChart(log) {
    const ctx = document.getElementById('drinksChart').getContext('2d');
    const groupedDrinks = groupDrinksByDay(log);
    const labels = Object.keys(groupedDrinks).reverse();
    const data = labels.map(date => groupedDrinks[date].reduce((sum, entry) => sum + parseFloat(entry.drinkUnits), 0));

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Drinks Over the Past 7 Days',
          data,
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Number of Drinks'
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  function loadChartJs(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => {
      callback();
    };
    document.head.appendChild(script);
  }
</script>

<Container>
  <Title order={1}>Drink Tracker App</Title>
  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <form on:submit={addDrink}>
      <label for="drink-size" style="display: block; margin-bottom: 5px;">Size of drink (oz):</label>
      <Input id="drink-size" type="number" required style="margin-bottom: 10px;" />

      <label for="alcohol-percentage" style="display: block; margin-bottom: 5px;">Alcohol percentage (%):</label>
      <Input id="alcohol-percentage" type="number" step="0.1" required style="margin-bottom: 10px;" />

      <Button type="submit">Add Drink</Button>
    </form>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>Total Drinks</Title>
    <Text>{$totalDrinkUnits.toFixed(2)} Standard Drinks</Text>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>Drinks in the Past 7 Days</Title>
    <Text>{$drinksLast7Days.toFixed(2)} Standard Drinks</Text>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>7-Day Running Average of Drinks per Day</Title>
    <Text>{$averageDrinksLast7Days.toFixed(2)} Standard Drinks per Day</Text>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>Drinks in the Past 3 Days</Title>
    <Text>{$drinksLast3Days.toFixed(2)} Standard Drinks</Text>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>Remaining Drinks Today to Stay Below 15 Drinks in 7 Days</Title>
    <Text>You can have up to {$remainingDrinksToday.toFixed(2)} more Standard Drinks today.</Text>
  </Card>

  <Card withBorder padding="lg" shadow="sm" style="margin-bottom: 20px;">
    <Title order={2}>Drinks Over the Past 7 Days (Chart)</Title>
    <div style="position: relative; height: 400px; width: 100%;">
      <canvas id="drinksChart"></canvas>
    </div>
  </Card>

  <Card withBorder padding="lg" shadow="sm">
    <Title order={2}>Drink Log</Title>
    {#each Object.entries(groupDrinksByDay($drinkLog)) as [date, entries]}
      <Title order={3} style="margin-top: 20px;">{date}</Title>
      {#if entries.length > 0}
        <ul>
          {#each entries as { timestamp, drinkUnits, drinkSize, alcoholPercentage }}
            <li>
              {timestamp}: {parseFloat(drinkUnits).toFixed(2)} Standard Drinks (Size: {drinkSize} oz, Alcohol: {alcoholPercentage}%)
            </li>
          {/each}
        </ul>
      {:else}
        <Text>🎉 No drinks for today!</Text>
      {/if}
    {/each}
  </Card>
</Container>

<style>
  ul {
    list-style-type: none;
    padding-left: 0;
  }
  li {
    margin-bottom: 5px;
  }
</style>
	