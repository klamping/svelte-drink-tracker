<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import {
    SvelteUIProvider,
    Group,
    Center,
    Button,
    Space,
    InputWrapper,
    NumberInput,
    Container,
    Card,
    Title,
    Text,
    Stack,
    Skeleton,
    Flex,
  } from "@svelteuidev/core";
  import { onDestroy } from "svelte";

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
  const previewCalories = writable(null);
  const showAllLogs = writable(false);
import { startOfToday, subDays, parseISO } from 'date-fns';

  // Load existing drinks data from localStorage when the component mounts
  onMount(() => {
    const storedTotal =
      localStorage.getItem("totalDrinkUnits") !== null
        ? parseFloat(localStorage.getItem("totalDrinkUnits"))
        : 0;
    totalDrinkUnits.set(storedTotal);

    const storedLog = JSON.parse(localStorage.getItem("drinkLog")) || [];

    // parse through the log and filter out any bad data
    let filteredLog = storedLog.filter(({ drinkSize, alcoholPercentage }) => {
      return (
        !Number.isNaN(Number.parseFloat(drinkSize)) &&
        !Number.isNaN(Number.parseFloat(alcoholPercentage))
      );
    });
    if (storedLog.length !== filteredLog.length) {
    }

    drinkLog.set(filteredLog);
    updateDrinkCounts(filteredLog);
    loadChartJs(() => createChart(filteredLog));
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  function getDrinkAmount(drinkSize, alcoholPercentage) {
    // Calculate drink units based on the standard drink size (12 oz at 5%)
    const standardDrinkSize = 12;
    const standardAlcoholPercentage = 5;
    const standardDrinkAmount =
      standardDrinkSize * (standardAlcoholPercentage / 100);
    const currentDrinkAmount = drinkSize * (alcoholPercentage / 100);
    return currentDrinkAmount / standardDrinkAmount;
  }

  function addDrink(event) {
    event.preventDefault();
    const rawDrinkSize = event.target.querySelector("#drink-size").value;
    const trimmedDrinkSize = rawDrinkSize.replace(/[^\.\d]/g, "");

    const rawAlcPerc = event.target.querySelector("#alcohol-percentage")?.value;
    const trimmedAlcPerc = rawAlcPerc.replace(/[^\.\d]/g, "");

    // Get input values
    const drinkSize = parseFloat(trimmedDrinkSize);
    const alcoholPercentage = parseFloat(trimmedAlcPerc);
    const entryDateValue = event.target.querySelector("#entry-date").value;
    const entryDate = entryDateValue ? new Date(entryDateValue) : new Date();

    const drinkUnits = getDrinkAmount(drinkSize, alcoholPercentage);

    // Update total drink units
    totalDrinkUnits.update((n) => {
      const updatedTotal = parseFloat(n) + drinkUnits;
      localStorage.setItem("totalDrinkUnits", updatedTotal);
      return updatedTotal;
    });

    // Add timestamped entry to drink log
    const timestamp = entryDate.toLocaleString();
    const newEntry = { timestamp, drinkUnits, drinkSize, alcoholPercentage };
    drinkLog.update((log) => {
      const updatedLog = [...log, newEntry];
      localStorage.setItem("drinkLog", JSON.stringify(updatedLog));
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
    const timeLog = log.reduce((acc, entry) => {
      const dateObj = new Date(entry.timestamp);
      const date = dateObj.toLocaleDateString();
      const dayOfWeek = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
      if (!acc[date]) {
        acc[date] = { totalUnits: 0, entries: [], dayOfWeek };
      }
      acc[date].entries.push({
        ...entry,
        timestamp: dateObj.toLocaleTimeString(),
      });
      acc[date].totalUnits += parseFloat(entry.drinkUnits);
      return acc;
    }, {});

    return Object.entries(timeLog).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }

  function updateDrinkCounts(log) {
    const now = startOfToday();
    const sevenDaysAgo = subDays(now, 7);
    const threeDaysAgo = subDays(now, 3);

    let countLast7Days = 0;
    let countLast3Days = 0;
    let countToday = 0;

    log.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      console.log(entry.timestamp)
      console.log(sevenDaysAgo)
      if (entryDate >= sevenDaysAgo) {
        countLast7Days += parseFloat(entry.drinkUnits) || 0;
      }
      if (entryDate >= threeDaysAgo) {
        countLast3Days += parseFloat(entry.drinkUnits) || 0;
      }
      if (entryDate >= now) {
        countToday += parseFloat(entry.drinkUnits) || 0;
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

  const getLast7DaysLabels = () => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dayOfWeek = daysOfWeek[date.getDay()];
      const dayOfMonth = date.getDate();
      result.push({
        logDate: date.toLocaleDateString(),
        display: `${dayOfWeek}, ${dayOfMonth}`,
      });
    }

    return result.reverse(); // Reverse to maintain order from oldest to newest
  };

  function createChart(log) {
    const ctx = document.getElementById("drinksChart").getContext("2d");
    const groupedDrinks = groupDrinksByDay(log);

    const lastWeek = getLast7DaysLabels();
    const labels = lastWeek.map(({ display }) => display);
    const data = lastWeek.map(({ logDate }) => {
      return Object.hasOwn(groupedDrinks, logDate)
        ? groupedDrinks[logDate].reduce(
            (sum, entry) => sum + parseFloat(entry.drinkUnits),
            0,
          )
        : 0;
    });

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Drinks Over the Past 7 Days",
            data,
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            title: {
              display: true,
              text: "Number of Drinks",
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function loadChartJs(callback) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => {
      callback();
    };
    document.head.appendChild(script);
  }

  function gramsOfAlcohol(drinkAmount) {
    return drinkAmount * 14;
  }

  function displayDrinkAmount(event) {
    const form = event.currentTarget;
    const rawDrinkSize = form.querySelector("#drink-size")?.value;
    const trimmedDrinkSize = rawDrinkSize.replace(/[^\.\d]/g, "");
    const drinkSize = parseFloat(trimmedDrinkSize);

    const rawAlcPerc = form.querySelector("#alcohol-percentage")?.value;
    const trimmedAlcPerc = rawAlcPerc.replace(/[^\.\d]/g, "");
    const alcoholPercentage = parseFloat(trimmedAlcPerc);

    if (!isNaN(drinkSize) && !isNaN(alcoholPercentage)) {
      const currentDrinkAmount = getDrinkAmount(drinkSize, alcoholPercentage);
      previewDrinkAmount.set(currentDrinkAmount);
      const estimatedCalories = Math.ceil(
        7 * gramsOfAlcohol(currentDrinkAmount),
      );
      previewCalories.set(estimatedCalories);
    } else {
      previewDrinkAmount.set(null);
    }
  }

  const toggleShowAllLogs = () => {
    showAllLogs.update(value => !value);
  };

  function filterRecentDays(log, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return log.filter(entry => new Date(entry.timestamp) >= cutoffDate);
  }

  const RainbowBorder = {
    border: "1px solid",
    borderImage:
      "conic-gradient(from var(--angle), red, yellow, lime, aqua, blue, magenta, red) 1",
    animation: "10s rotate linear infinite",
    "--angle": "0deg",
  };
</script>

<SvelteUIProvider withGlobalStyles themeObserver={"dark"}>
  <Container>
    <Title order={1} style="margin: 1rem 0;"
      >The Annoyingly Correct Drink Tracker</Title
    >
    <Stack space="xl">
      <Card padding="lg" shadow="sm" css={RainbowBorder}>
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
              parser={(value) => value.replace(/[^\.\d]/g, "")}
              formatter={(value) =>
                !Number.isNaN(parseFloat(value))
                  ? value.replace(/[^\.\d]/g, "")
                  : ""}
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
          <Flex justify="space-between" wrap="nowrap" gap="lg">
            <Group spacing="xs">
              <Text>Drink Amount:</Text>
              {#if $previewDrinkAmount !== null}
                <Text>{$previewDrinkAmount.toFixed(2)}</Text>
              {:else}
                <Skeleton height={6} animate={false} width={15} />
              {/if}
            </Group>
            <Group spacing="xs">
              <Text>Est. Cals:</Text>
              {#if $previewCalories !== null}
                <Text>{$previewCalories}</Text>
              {:else}
                <Skeleton height={6} animate={false} width={15} />
              {/if}
            </Group>
            <input
              id="entry-date"
              type="datetime-local"
              style="width:2em;background:#495057;border:0;"
            />
          </Flex>
          <Space h="xl" />
          <Center>
            <Button
              variant="gradient"
              gradient={{ from: "violet", to: "pink", deg: 50 }}
              radius="md"
              size="lg"
              fullSize
            >
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
        <Text>{$averageDrinksLast7Days.toFixed(2)} Standard Drinks per Day</Text
        >
      </Card>

      <Card withBorder padding="lg" shadow="sm">
        <Title order={2}>Drinks in the Past 3 Days</Title>
        <Space h="sm" />
        <Text>{$drinksLast3Days.toFixed(2)} Standard Drinks</Text>
      </Card>

      <Card withBorder padding="lg" shadow="sm">
        <Title order={2}
          >Remaining Drinks Today to Stay Below 15 Drinks in 7 Days</Title
        >
        <Space h="sm" />
        <Text
          >You can have up to {$remainingDrinksToday.toFixed(2)} more Standard Drinks
          today.</Text
        >
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
        {#if !$showAllLogs}
          {#each groupDrinksByDay(filterRecentDays($drinkLog, 7)) as [date, { totalUnits, entries, dayOfWeek }]}
            <Group noWrap spacing="xs" align="center" style="margin-top: 1rem;">
              <Title order={3}>
                {dayOfWeek}, {date}
                <Text color='gray' root="span"><em>({totalUnits.toFixed(2)})</em></Text>
              </Title>
            </Group>
            <ul>
              {#each entries as { timestamp, drinkUnits, drinkSize, alcoholPercentage }}
                <li>
                  <strong>{timestamp}</strong>: {parseFloat(drinkUnits).toFixed(2)} (<em>{drinkSize} oz, {alcoholPercentage}%</em>)
                </li>
              {/each}
            </ul>
          {/each}
          <Button on:click={toggleShowAllLogs}>View Full Log</Button>
        {:else}
          {#each groupDrinksByDay($drinkLog) as [date, { totalUnits, entries, dayOfWeek }]}
            <Group noWrap spacing="xs" align="center" style="margin-top: 1rem;">
              <Title order={3}>
                {dayOfWeek}, {date}
                <Text color='gray' root="span"><em>({totalUnits.toFixed(2)})</em></Text>
              </Title>
            </Group>
            <ul>
              {#each entries as { timestamp, drinkUnits, drinkSize, alcoholPercentage }}
                <li>
                  <strong>{timestamp}</strong>: {parseFloat(drinkUnits).toFixed(2)} (<em>{drinkSize} oz, {alcoholPercentage}%</em>)
                </li>
              {/each}
            </ul>
          {/each}
          <Button on:click={toggleShowAllLogs}>Hide Full Log</Button>
        {/if}
      </Card>

      <Card withBorder padding="lg" shadow="sm">
        <Title order={2}>Total Drinks</Title>
        <Space h="sm" />
        <Text>{$totalDrinkUnits.toFixed(2)} Standard Drinks</Text>
      </Card>
    </Stack>
  </Container>
</SvelteUIProvider>
