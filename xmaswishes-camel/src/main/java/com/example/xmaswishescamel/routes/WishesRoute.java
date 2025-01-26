package com.example.xmaswishescamel.routes;

import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.model.dataformat.JsonLibrary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Component
public class WishesRoute extends RouteBuilder {

    @Value("${wishes.scan.directory:./scanned-wishes}")
    private String scanDirectory;

    @Value("${wishes.processed.directory:./processed}")
    private String processedDirectory;

    @Value("${wishes.error.directory:./error}")
    private String errorDirectory;

    @Value("${wishes.api.endpoint:http://localhost:3000/api/wishes}")
    private String apiEndpoint;

    @Override
    public void configure() throws Exception {
        // Fehlerbehandlung: Bei Fehlern in der Route wird die Datei in den Fehlerordner verschoben
        onException(Exception.class)
            .handled(true)
            .log("Fehler beim Verarbeiten der Datei ${file:name}: ${exception.message}")
            .to("file://" + errorDirectory);

        // Route zum Überwachen und Verarbeiten der Dateien
        from("file://" + scanDirectory + "?noop=false&include=.*\\.txt") // Passe den Dateityp an
            .routeId("WishesFileProcessor")
            .log("Verarbeite Datei: ${file:name}")
            // Optional: Text extrahieren, falls die Datei Text enthält
            // Falls die Dateien in einem anderen Format sind (z.B. PDF), muss ein entsprechender Extractor verwendet werden
            .convertBodyTo(String.class)
            // Erstelle JSON aus dem extrahierten Text
            .process(exchange -> {
                String body = exchange.getIn().getBody(String.class);
                String[] lines = body.split("\\r?\\n");
                if (lines.length < 2) {
                    throw new Exception("Unzureichende Daten in der Datei");
                }
                String name = lines[0].trim();
                String wish = lines[1].trim();
            
                // Create a JSON-like Map
                Map<String, Object> jsonPayload = new HashMap<>();
                jsonPayload.put("name", name);
                jsonPayload.put("wish", wish);
            
                exchange.getIn().setBody(jsonPayload);
            })
            .marshal().json(JsonLibrary.Jackson)
            // Sende die Daten an die API
            .setHeader("CamelHttpMethod", constant("POST"))
            .setHeader("Content-Type", constant("application/json"))
            .log("Sending JSON payload: ${body}")
            .toD(apiEndpoint)
            .log("Wunsch erfolgreich gesendet: ${body}")
            // Verschiebe die verarbeitete Datei in den 'processed'-Ordner
            .to("file://" + processedDirectory);
    }
}
