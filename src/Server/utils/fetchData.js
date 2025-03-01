export const exerciseOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': '6b14f01acamshaab86d1944a63d1p1fd522jsn040a6d9bf0a0',
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
  }
};

export const youtubeOptions = {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': '6b14f01acamshaab86d1944a63d1p1fd522jsn040a6d9bf0a0',
    'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
  }
};

export const fetchData = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data;
};

export const fetchAllExercises = async () => {
  let exercises = [];
  let limit = 20; // Adjust the limit as needed
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`;
    const data = await fetchData(url, exerciseOptions);
    exercises = exercises.concat(data);
    offset += limit;
    hasMore = data.length === limit; // Adjust based on the API's pagination response
  }

  return exercises;
};
