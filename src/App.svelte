<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { SvelteUIProvider, Group, Center, Button, Space, InputWrapper, NumberInput, Container, Card, Title, Text, Stack, Skeleton } from '@svelteuidev/core';
  import { onDestroy } from 'svelte';

  let chart;

  // Define reactive variables for total drinks and drink log
  const totalDrinkUnits = writable(0);
  const drinkLog = writable([]);
  const drinksLast7Days = writable(0);
  const drinksLast3Days = writable(0);
  const drinksToday = writable(0);
  const remainingDrinksToday = writable(0);
  const averageDrinksLast7Days = writable(0);
  const previewDrinkAmount = writable(null);

  // Load existing drinks data from localStorage when the component mounts
  onMount(() => {
    const storedTotal = localStorage.getItem('totalDrinkUnits') !== null ? parseFloat(localStorage.getItem('totalDrinkUnits')) : 0;
    totalDrinkUnits.set(storedTotal);

    const storedLog = JSON.parse(localStorage.getItem('drinkLog')) || [];
    drinkLog.set(storedLog);
    updateDrinkCounts(storedLog);
    loadChartJs(() => createChart(storedLog));
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  function addDrink(event) {
    event.preventDefault();

    // Get input values
    const drinkSize = parseFloat(event.target.querySelector('#drink-size').value);
    const alcoholPercentage = parseFloat(event.target.querySelector('#alcohol-percentage').value);

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
    previewDrinkAmount.set(null);
  }

  function groupDrinksByDay(log) {
    return log.reduce((acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
	  const updatedEntry = { ...entry, timestamp: new Date(entry.timestamp).toLocaleTimeString() };
      acc[date].push(updatedEntry);
      return acc;
    }, {});
  }

  function updateDrinkCounts(log) {
    const now = new Date();
	now.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    let countLast7Days = 0;
    let countLast3Days = 0;
    let countToday = 0;

    log.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= sevenDaysAgo) {
        countLast7Days += parseFloat(entry.drinkUnits);
      }
      if (entryDate >= threeDaysAgo) {
        countLast3Days += parseFloat(entry.drinkUnits);
      }
      if (entryDate >= now) {
        countToday += parseFloat(entry.drinkUnits);
      }
    });

    drinksLast7Days.set(countLast7Days);
    drinksLast3Days.set(countLast3Days);
    drinksToday.set(countToday);

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

  function displayDrinkAmount(event) {
    const form = event.currentTarget;
    const drinkSize = parseFloat(form.querySelector('#drink-size')?.value);
    const alcoholPercentage = parseFloat(form.querySelector('#alcohol-percentage')?.value);

    if (!isNaN(drinkSize) && !isNaN(alcoholPercentage)) {
      const standardDrinkSize = 12;
      const standardAlcoholPercentage = 5;
      const standardDrinkAmount = standardDrinkSize * (standardAlcoholPercentage / 100);
      const currentDrinkAmount = drinkSize * (alcoholPercentage / 100);
      previewDrinkAmount.set(currentDrinkAmount / standardDrinkAmount);
    } else {
      previewDrinkAmount.set(null);
    }
  }
</script>

<SvelteUIProvider withGlobalStyles themeObserver={'dark'}>
	<Container>
		<Title order={1} style="margin: 1rem 0;">The Annoyingly Correct Drink Tracker</Title>
		<Stack space="xl">
			<Card withBorder padding="lg" shadow="sm">
				<form on:submit={addDrink} on:input={displayDrinkAmount}>
					<InputWrapper label="Size of drink (oz):" size="lg">
						<NumberInput 
							id="drink-size"
							precision={1}
							step={0.1}
							required
							variant="filled"
							radius="md"
							hideControls
							size="lg"
							min={0}
						/>
					</InputWrapper>

					<Space h="sm" />
					<InputWrapper label="Alcohol percentage (%):" size="lg">
						<NumberInput 
							id="alcohol-percentage"
							precision={1}
							step={0.1}
							required
							variant="filled"
							radius="md"
							size="lg"
							hideControls
							min={0}
							max={100}
						/>
					</InputWrapper>

					<Space h="sm" />
					<Group spacing="xs">
						<Text>Amount:</Text>
						{#if $previewDrinkAmount !== null}
							<Text>{$previewDrinkAmount.toFixed(2)} Standard Drinks</Text>
						{:else}
							<Skeleton height={6} animate={false} width={15} />
						{/if}
					</Group>
					<Space h="xl" />
					<Center>
						<Button variant="gradient" gradient={{ from: 'violet', to: 'pink', deg: 50 }} radius="md" size="lg" fullSize>
							Add Drink
						</Button>
					</Center>
				</form>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Total Drinks Today</Title>
				<Space h="sm" />
				{#if $drinksToday > 0}
				<Text>{$drinksToday.toFixed(2)} Standard Drinks</Text>
				{:else}
					<Text>🎉 No drinks for today! Wanna keep it that way??</Text>
				{/if}
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Drinks in the Past 7 Days</Title>
				<Space h="sm" />
				<Text>{$drinksLast7Days.toFixed(2)} Standard Drinks</Text>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>7-Day Running Average of Drinks per Day</Title>
				<Space h="sm" />
				<Text>{$averageDrinksLast7Days.toFixed(2)} Standard Drinks per Day</Text>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Drinks in the Past 3 Days</Title>
				<Space h="sm" />
				<Text>{$drinksLast3Days.toFixed(2)} Standard Drinks</Text>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Remaining Drinks Today to Stay Below 15 Drinks in 7 Days</Title>
				<Space h="sm" />
				<Text>You can have up to {$remainingDrinksToday.toFixed(2)} more Standard Drinks today.</Text>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Drinks Over the Past 7 Days (Chart)</Title>
				<Space h="sm" />
				<div style="position: relative; height: 400px; width: 100%;">
				<canvas id="drinksChart"></canvas>
				</div>
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Drink Log</Title>
				{#each Object.entries(groupDrinksByDay($drinkLog)) as [date, entries]}
				<Title order={3} style="margin-top: 1rem;">{date}</Title>
				{#if entries.length > 0}
					<ul>
					{#each entries as { timestamp, drinkUnits, drinkSize, alcoholPercentage }}
						<li>
						<strong>{timestamp}</strong>: {parseFloat(drinkUnits).toFixed(2)} (<em>{drinkSize} oz, {alcoholPercentage}%</em>)
						</li>
					{/each}
					</ul>
				{:else}
					<Text>🎉 No drinks for today!</Text>
				{/if}
				{/each}
			</Card>

			<Card withBorder padding="lg" shadow="sm">
				<Title order={2}>Total Drinks</Title>
				<Space h="sm" />
				<Text>{$totalDrinkUnits.toFixed(2)} Standard Drinks</Text>
			</Card>
		</Stack>
	</Container>
</SvelteUIProvider>

<style>
  ul {
    list-style-type: none;
    padding-left: 0;
  }
  li {
    margin-bottom: 5px;
  }
</style>
