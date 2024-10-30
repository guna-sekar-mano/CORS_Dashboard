import React, { useEffect, useRef, useState } from 'react';
import '@arcgis/core/assets/esri/themes/light/main.css';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Legend from '@arcgis/core/widgets/Legend';
import Expand from '@arcgis/core/widgets/Expand';
import Search from '@arcgis/core/widgets/Search';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Circle from '@arcgis/core/geometry/Circle';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import esriRequest from '@arcgis/core/request';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Measurement from '@arcgis/core/widgets/Measurement';
import esriConfig from '@arcgis/core/config';
import * as locator from '@arcgis/core/rest/locator';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
import * as geometryEngineAsync from '@arcgis/core/geometry/geometryEngineAsync';
import sendJsonData from '../apiService';
import Home from '@arcgis/core/widgets/Home';
import Bookmarks from '@arcgis/core/widgets/Bookmarks';
import BgLoader from './bg_loader';  // Import the bg_loader component
import Collection from '@arcgis/core/core/Collection';
import Extent from '@arcgis/core/geometry/Extent';
import Print from '@arcgis/core/widgets/Print';
import Fullscreen from '@arcgis/core/widgets/Fullscreen'


const CORSMap = ({ onLocationFound, outputData, coordinates }) => {
  const mapRef = useRef(null);
  const distanceRef = useRef(null);
  const areaRef = useRef(null);
  const clearRef = useRef(null);
  const radiusRef = useRef(null);
  const radiusDropdownRef = useRef(null);
  const toolbarDivRef = useRef(null);
  const sketchViewModelRef = useRef(null);
  const selectRef = useRef(null);
  const markerLayer = useRef(null);  // Keep track of marker layer reference
  const viewRef = useRef(null);  // Keep track of the view reference
  const [fetchedData, setFetchedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState(0);  // Radius selection state
  const [selectedFeatures, setSelectedFeatures] = useState([]);  // State to store selected features
  const [bookmarks, setBookmarks] = useState([]); // State to store bookmarks
  const [bg_loader, setBgLoader] = useState(true);  // Update to bg_loader state

  // Fetch data once on component mount if outputData is not provided
  useEffect(() => {
    if (!outputData) {
      const date = new Date('2024-04-14');
      const input_data = {
        date: date,
        options: 'Initial Load'
      };
      setBgLoader(true);  // Show bg_loader
      sendJsonData(input_data)
        .then(response => {
          setFetchedData(response.data);
          setLoading(false);
          setBgLoader(false);  // Hide bg_loader after fetching data
        })
        .catch(error => {
          console.error("There was an error fetching data!", error);
          setLoading(false);
          setBgLoader(false);
        });
    } else {
      setLoading(false);
      setBgLoader(false);
    }
  }, []);

  // Initialize the map (Only Once)
  useEffect(() => {
    if (loading ) return;  // Prevent re-initialization
    if (!fetchedData && !outputData) {
      console.error("No data available to display on the map");
      return;
    }

    // Set the API key
    esriConfig.apiKey = 'AAPKdc7b2ff2df0643c9862ec9d816a967c68kookelLZzekcspoX5TtjXoVKK9lvFU3vJ6sILgSwqXg8efMFEBCc9NlnqYtlAid';  // Replace with your Esri API key

    let url;
    let presentCount = 0;
    let notPresentCount = 0;
    let prediction_status;
    let uncertainty_status;

    if (outputData) {
      console.log("from output Data");
      console.log(outputData);
      prediction_status = outputData.mycs2_prediction;
      uncertainty_status = outputData.uncertainty;
      const blob = new Blob([JSON.stringify(outputData)], {
        type: "application/json",
      });
      url = URL.createObjectURL(blob);
      presentCount = outputData.status_count;
      notPresentCount = outputData.features.length - presentCount;
    } else if (fetchedData) {
      prediction_status = false;  // Assign default value
      uncertainty_status = false; // Assign default value
      console.log("from fetch Data");
      console.log(fetchedData);
      const blob = new Blob([JSON.stringify(fetchedData)], {
        type: "application/json",
      });
      url = URL.createObjectURL(blob);
      presentCount = fetchedData.status_count;
      notPresentCount = fetchedData.features.length - presentCount;
    }

    const template = {
      title: "Site Info",
      content: `<b>Site ID:</b> {SITEID}<br>
                <b> Description: </b> {Description}<br>
                <b> DOMES : </b> {DOMES} <br>`
    };

    // Updated renderer based on status
    const renderer = {
      type: "unique-value",
      field: "STATUS",
      uniqueValueInfos: [
        {
          value: "Present",
          symbol: {
            type: "simple-marker",
            color: "blue",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Present (${presentCount})`
        },
        {
          value: "Not Present",
          symbol: {
            type: "simple-marker",
            color: "red",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Not Present (${notPresentCount})`
        }
      ]
    };

    const renderer_1 = {
      type: "unique-value",
      field: "STATUS",
      uniqueValueInfos: [
        {
          value: uncertainty_status ? "Uncertainty":"MYCS2 Prediction",
          symbol: {
            type: "simple-marker",
            color: "orange",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: uncertainty_status ? `Uncertainty (${presentCount})`:`MYCS2 Prediction (${presentCount})`
        },
        {
          value: "Observation",
          symbol: {
            type: "simple-marker",
            color: "green",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Observation (${notPresentCount})`
        }
      ]
    };

    const geojsonLayer = new GeoJSONLayer({
      url: url,
      popupTemplate: template,
      renderer: prediction_status ? renderer_1 : renderer,
      orderBy: {
        field: "STATUS"
      }
    });

    const polygonGraphicsLayer = new GraphicsLayer(); // Layer to hold the drawn rectangle
    markerLayer.current = new GraphicsLayer();  // Graphics layer for markers
    const map = new Map({
      basemap: "gray-vector",
      layers: [geojsonLayer, polygonGraphicsLayer, markerLayer.current]  // Added markerLayer
    });

    const view = new MapView({
      container: mapRef.current,
      center: [-95.7129, 37.0902],
      zoom: 3,
      map: map
    });

    viewRef.current = view;  // Store the view in the ref for later use

    // Handle uncertainty if enabled
    if (uncertainty_status && outputData) {
      outputData.features.forEach(feature => {
        const point = new Point({
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0]
        });

        // Adjust the scaling factor to make the uncertainty circle bigger
        const uncertaintyRadius = Math.max(...feature.geometry.Uncertainty) * 1e6; // Scale uncertainty value (larger multiplier)
        
        // Create a circle for uncertainty
        const uncertaintyCircle = new Circle({
          center: point,
          radius: uncertaintyRadius,
          radiusUnit: "meters"
        });

        // Define the symbol for the uncertainty circle
        const fillSymbol = new SimpleFillSymbol({
          color: [255, 0, 0, 0.3],  // Semi-transparent red fill for uncertainty
          outline: {
            color: [255, 0, 0, 0.8], // Red outline for uncertainty
            width: 1
          }
        });

        // Create a graphic for the uncertainty circle
        const circleGraphic = new Graphic({
          geometry: uncertaintyCircle,
          symbol: fillSymbol
        });

        // Create a marker symbol for the lat/lon point
        const markerSymbol = {
          type: "simple-marker",  // Style for the marker
          color: [0, 110, 51],  // Green marker color
          outline: {
            color: [255, 255, 255],  // White outline
            width: 2
          },
          size: "10px"  // Size of the marker
        };

        // Create a graphic for the marker at the lat/lon point
        const pointGraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol
        });

        // Add the uncertainty circle and point marker to the marker layer
        markerLayer.current.add(circleGraphic);
        markerLayer.current.add(pointGraphic);
      });
    }
    view.when(() => {
      const legend = new Expand({
        content: new Legend({
          view: view,
          style: "card"
        }),
        view: view,
        expanded: true
      });

      view.ui.add(legend, "bottom-left");

      // Custom Search
      const customSearchSource = {
        placeholder: "Search by SITEID",
        getSuggestions: (params) => {
          return esriRequest(url, {
            responseType: "json"
          }).then((results) => {
            return results.data.features
              .filter((feature) => feature.properties.SITEID.includes(params.suggestTerm))
              .map((feature) => ({
                key: feature.properties.SITEID,
                text: feature.properties.SITEID,
                sourceIndex: params.sourceIndex
              }));
          });
        },
        getResults: (params) => {
          return esriRequest(url, {
            responseType: "json"
          }).then((results) => {
            const filteredFeatures = results.data.features.filter((feature) =>
              feature.properties.SITEID === params.suggestResult.text.trim()
            );

            const searchResults = filteredFeatures.map((feature) => {
              const graphic = new Graphic({
                geometry: new Point({
                  x: feature.geometry.coordinates[0],
                  y: feature.geometry.coordinates[1]
                }),
                attributes: feature.properties
              });

              const buffer = geometryEngine.geodesicBuffer(graphic.geometry, 100, "meters");
              const propertiesString = Object.entries(feature.properties)
                .slice(0, -1)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");
              return {
                extent: buffer.extent,
                feature: graphic,
                name: propertiesString,
              };
            });

            return searchResults;
          });
        }
      };

      const searchWidget = new Search({
        view: view,
        sources: [customSearchSource]
      });

      view.ui.add(searchWidget, "top-right");
      const fullScreen = new Fullscreen({
        view: view
      })
      view.ui.add(fullScreen, "top-right");
      // Basemap Gallery
      const basemapGallery = new Expand({
        content: new BasemapGallery({
          view: view,
          container: document.createElement("div"),
        }),
        view: view,
        expanded: false
      });

      view.ui.add(basemapGallery, "top-right");

      // Measurement widget
      const measurement = new Measurement({
        view: view
      });

      view.ui.add(measurement, "bottom-right");

      // Add Home Button here
      const homeWidget = new Home({
        view: view
      });
      view.ui.add(homeWidget, "top-right");

      // Ensure toolbar elements are available before using them
      if (toolbarDivRef.current) {
        view.ui.add(toolbarDivRef.current, "top-left");
      } else {
        console.error("Toolbar div is not found");
      }


      // Initialize SketchViewModel
      sketchViewModelRef.current = new SketchViewModel({
        view: view,
        layer: polygonGraphicsLayer
      });

      // Handle rectangle creation and feature selection
      sketchViewModelRef.current.on('create', async (event) => {
        if (event.state === 'complete') {
          const geometries = polygonGraphicsLayer.graphics.map(graphic => graphic.geometry);
          const queryGeometry = await geometryEngineAsync.union(geometries.toArray());

          const query = geojsonLayer.createQuery();
          query.geometry = queryGeometry;
          query.outFields = ['*'];
          query.returnGeometry = true;

          const results = await geojsonLayer.queryFeatures(query);

          // Set the selected features in state
          setSelectedFeatures(results.features);
        }
      });

      // Toolbar functionality
      distanceRef.current.onclick = function () {
        measurement.activeTool = "distance";
      };

      areaRef.current.onclick = function () {
        measurement.activeTool = "area";
      };

      clearRef.current.onclick = function () {
        measurement.clear();  // Clear any measurement tools
        polygonGraphicsLayer.removeAll();  // Clear all graphics in the graphics layer
        view.graphics.removeAll();  // Clear any other graphics on the view
        markerLayer.current.removeAll();  // Clear the marker from the markerLayer
        setSelectedFeatures([]);  // Clear the selected features from the state
      };

      radiusRef.current.onclick = function () {
        radiusDropdownRef.current.classList.toggle('hidden'); // Show/hide the dropdown
      };

      selectRef.current.onclick = () => {
        view.graphics.removeAll(); // Clear previous graphics
        sketchViewModelRef.current.create('rectangle');
      };

      // // Bookmark Widget
      // const bookmarksWidget = new Bookmarks({
      //   view: view,
      //   editingEnabled: true, // Allow adding and editing bookmarks
      //   bookmarks: null // Load existing bookmarks from state
      // });

      // const bookmarksExpand = new Expand({
      //   view: view,
      //   content: bookmarksWidget,
      //   expanded: false
      // });

      // view.ui.add(bookmarksExpand, "top-right");

      // // Handle bookmark selection
      // bookmarksWidget.on("bookmark-select", (event) => {
      //   console.log("Select");
      //   const selectedBookmark = event.bookmark;
      //   if (selectedBookmark && selectedBookmark.extent) {
      //     view.goTo(selectedBookmark.extent);
      //   } else if (selectedBookmark && selectedBookmark.name) {
      //     // Geocode the place name and navigate
      //     const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
      //     locator.addressToLocations(locatorUrl, {
      //       address: { SingleLine: selectedBookmark.name },
      //       maxLocations: 1
      //     }).then((results) => {
      //       if (results.length > 0) {
      //         const location = results[0].location;
      //         view.goTo({
      //           target: location,
      //           zoom: 12
      //         });
      //       } else {
      //         console.error("Location not found for bookmark");
      //       }
      //     }).catch((error) => {
      //       console.error("Error in geocoding bookmark name:", error);
      //     });
      //   }
      // });

      // // Save new bookmarks to state
      // bookmarksWidget.on("bookmark-edit", (event) => {
      //   setBookmarks(bookmarksWidget.bookmarks.toArray());
      // });

      // Step 1: Retrieve stored bookmarks from localStorage
      const storedBookmarks = localStorage.getItem('userBookmarks');
      let initialBookmarks = [];

      if (storedBookmarks) {
        try {
          initialBookmarks = JSON.parse(storedBookmarks);
          console.log('Retrieved bookmarks from localStorage:', initialBookmarks);
        } catch (error) {
          console.error('Error parsing bookmarks from localStorage:', error);
          initialBookmarks = [];
        }
      }

      // Step 2: Initialize the Bookmarks widget with stored bookmarks
      const bookmarksWidget = new Bookmarks({
        view: viewRef.current,
        dragEnabled: true,  // Enable drag functionality

        // Control visibility of bookmark buttons
        visibleElements: {
          editBookmarkButton: true,
          addBookmarkButton: true
        },
        bookmarks: new Collection(initialBookmarks.length > 0 ? initialBookmarks : []),
      });

      const bookmarksExpand = new Expand({
        view: viewRef.current,
        content: bookmarksWidget,
        expanded: false
      });
      view.ui.add(bookmarksExpand, 'top-right');      
      // Step 3: Handle all changes (bookmark create, edit, and delete) using 'change' event
      bookmarksWidget.bookmarks.on('change', (event) => {
        const updatedBookmarks = bookmarksWidget.bookmarks.toArray();
        
        // Handle new bookmarks added
        if (event.added && event.added.length > 0) {
          console.log('Bookmark(s) added:', event.added);
        }

        // Handle bookmarks removed
        if (event.removed && event.removed.length > 0) {
          console.log('Bookmark(s) removed:', event.removed);
        }

        // Update localStorage and application state after any change
        setBookmarks(updatedBookmarks);
        localStorage.setItem('userBookmarks', JSON.stringify(updatedBookmarks));
        console.log('Bookmarks collection changed and updated in localStorage:', updatedBookmarks);
      });

      // Step 4: Handle bookmark selection (remains the same)
      bookmarksWidget.on('bookmark-select', (event) => {
        console.log("selected");
        const selectedBookmark = event.bookmark;
        console.log(selectedBookmark.name);
        if (selectedBookmark && selectedBookmark.name) {
          // Geocode the place name and navigate
          const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
          locator.addressToLocations(locatorUrl, {
            address: { SingleLine: selectedBookmark.name },
            maxLocations: 1
          }).then((results) => {
            if (results.length > 0) {
              const location = results[0].location;
              view.goTo({
                target: location,
                zoom: 12
              });
            } else {
              console.error("Location not found for bookmark");
            }
          }).catch((error) => {
            console.error("Error in geocoding bookmark name:", error);
          });
        }
      });

      // **Initialize the Print Widget**
      // const printWidget = new Print({
      //   view: view,
      //   printServiceUrl:
      //     "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
      // });
      // view.ui.add(printWidget, "top-right"); // **Add Print widget to the top-right corner**

      // **Define the Print Widget first**
      const printWidget = new Print({
        view: view,
        printServiceUrl:
          "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
      });

      // **Then wrap it inside the Expand widget**
      const printExpand = new Expand({
        content: printWidget,  // Pass the defined printWidget here
        view: view,
        expanded: false,  // Start in a collapsed state
        expandIconClass: "esri-icon-printer",  // Optional: Icon for the expand button
        expandTooltip: "Print Map"  // Tooltip when hovering over the expand button
      });

      // Add the Expand widget (with the Print widget inside) to the top-right corner
      view.ui.add(printExpand, "top-right");

      view.on("click", (event) => {
        const lat = event.mapPoint.latitude.toFixed(2);
        const lon = event.mapPoint.longitude.toFixed(2);

        // Always find the location and pass it to the callback
        const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
        locator.locationToAddress(locatorUrl, {
          location: event.mapPoint
        })
          .then((response) => {
            onLocationFound({
              address: response.address,
              latitude: lat,
              longitude: lon
            });
          })
          .catch((error) => {
            console.error("Error fetching address:", error);
            onLocationFound({
              address: "Address not found",
              latitude: lat,
              longitude: lon
            });
          });
      });
    });
  }, [onLocationFound, outputData, fetchedData, loading,bg_loader]);  // Initialize map only once

  // Handle radius changes without reloading the map
  useEffect(() => {
    if (!viewRef.current) return;

    // On map click, apply the selected radius
    const handleClick = (event) => {
      const lat = event.mapPoint.latitude.toFixed(2);
      const lon = event.mapPoint.longitude.toFixed(2);

      if (!radiusDropdownRef.current.classList.contains('hidden')) {
        const centerPoint = new Point({
          longitude: lon,
          latitude: lat
        });

        const circleGeometry = geometryEngine.geodesicBuffer(centerPoint, selectedRadius, "kilometers");

        const circleGraphic = new Graphic({
          geometry: circleGeometry,
          symbol: {
            type: "simple-fill",
            color: [0, 0, 255, 0.2],
            outline: {
              color: [0, 0, 255, 0.8],
              width: 2
            }
          }
        });

        viewRef.current.graphics.removeAll();  // Remove existing graphics
        viewRef.current.graphics.add(circleGraphic);  // Add new circle
      }

    };

    // Attach the click event listener to the map view
  const clickHandle = viewRef.current.on("click", handleClick);

  // Cleanup the event listener on component unmount
  return () => {
    clickHandle.remove();  // Correct way to remove the event listener
  };
}, [selectedRadius]);  // Re-run only when `selectedRadius` changes

  // Handle coordinates change (Update marker without reloading the map)
  useEffect(() => {
    if (coordinates && viewRef.current && markerLayer.current) {
      const { lat, lon } = coordinates;
      const point = new Point({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      });

      const markerSymbol = {
        type: "simple-marker",  // Style for the marker
        style: "square",
        color: [0,110,51],  // Green color
        outline: {
          color: [255, 255, 255],  // White outline
          width: 2
        }
      };

      const marker = new Graphic({
        geometry: point,
        symbol: markerSymbol
      });

      markerLayer.current.removeAll();  // Clear previous markers
      markerLayer.current.add(marker);  // Add new marker

      // Fix: Ensure goTo zooms to the correct location without padding
      viewRef.current.goTo({
        center: point,
        zoom: 10  // Adjust zoom level as necessary
      }, {
        animate: true,  // Optional: add animation
        duration: 1000,  // Optional: control duration of zoom
        easing: "ease-in-out",  // Optional: control easing effect
        maxZoom: 15,  // Ensure it doesn't zoom too much
        padding: { top: 0, bottom: 0, left: 0, right: 0 }  // No padding, center exactly on the point
      });
    }
  }, [coordinates]);  // Only update when coordinates change

  return (
    <div>
      {/* Show bg_loader if bg_loader is true */}
      {bg_loader && <BgLoader />}
      <div ref={toolbarDivRef} id="toolbarDiv" className="esri-component esri-widget absolute top-20 left-[1px] z-10">
        <button ref={distanceRef} className="esri-widget--button esri-interactive esri-icon-measure-line" title="Distance Measurement Tool"></button>
        <button ref={areaRef} className="esri-widget--button esri-interactive esri-icon-measure-area" title="Area Measurement Tool"></button>
        <button ref={radiusRef} className="esri-widget--button esri-interactive esri-icon-dial" title="Radius Measurement Tool"></button>
        <button ref={selectRef} className="esri-widget--button esri-interactive esri-icon-checkbox-unchecked" title="Select by Rectangle"></button>
        <div ref={radiusDropdownRef} className="esri-widget esri-interactive absolute top-8 left-[60px] z-10 bg-white shadow-md p-2 rounded hidden">
          <label htmlFor="radius-select">Choose Radius:</label>
          <select id="radius-select" onChange={(e) => setSelectedRadius(Number(e.target.value))} value={selectedRadius}>
            <option value={0}>Choose km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={200}>200 km</option>
            <option value={500}>500 km</option>
            <option value={1000}>1000 km</option>
          </select>
        </div>
        <button ref={clearRef} className="esri-widget--button esri-interactive esri-icon-trash" title="Clear Measurements"></button>
      </div>
      <div ref={mapRef} className="h-[88vh] w-full"></div>  {/* Attach the map view to this div */}
      
      {/* Display the selected features in a table */}
      <div className="selected-features-table p-4">
        <h3 className="text-lg font-semibold mb-4">Selected Features:</h3>
        {selectedFeatures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 border">Site ID</th>
                  <th className="px-4 py-2 border">Status</th>
                  {/* Add more columns as needed */}
                </tr>
              </thead>
              <tbody>
                {selectedFeatures.map((feature, index) => (
                  <tr key={index} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border">{feature.attributes.SITEID}</td>
                    <td className="px-4 py-2 border">{feature.attributes.STATUS}</td>
                    {/* Add more columns as needed */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No features selected.</p>
        )}
      </div>
    </div>
  );
};

export default CORSMap;
